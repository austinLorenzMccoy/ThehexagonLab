import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initiateTransfer, verifyTransfer, isPaystackConfigured } from '@/lib/paystack'
import { getDecryptedRecipientCode } from '@/lib/crypto'
import { convertUsdTo } from '@/lib/fx'
import { assertAdmin, isDemoPreview } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payouts/process — admin-only. Settles an *approved*
 * `payout_requests` row via Paystack Transfer.
 *
 * This intentionally degrades gracefully instead of failing hard when
 * Paystack isn't wired up yet (no PAYSTACK_SECRET_KEY, or the requester
 * has no `paystack_recipient_code` on file): it leaves the request
 * `approved` and returns a clear reason so the admin can settle the
 * payout manually and mark it paid from the Referrals & Payouts page.
 *
 * Claims the request (conditional UPDATE to 'processing', only
 * succeeding from 'pending'/'approved'/'failed') BEFORE calling
 * Paystack, so two concurrent "Mark Paid" clicks can't both fire a
 * real transfer — see doc/paystack_integration_guide.md gap #4.
 * Converts to the requester's payout_currency (gap #2) and confirms
 * via verifyTransfer() instead of trusting the initial response alone
 * (gap #3); a still-pending transfer stays 'processing' until the
 * /api/webhooks/paystack endpoint resolves it.
 */
export async function POST(request: NextRequest) {
  if (await isDemoPreview()) {
    return NextResponse.json({ error: 'Payouts cannot be processed in preview mode' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { payoutRequestId } = await request.json()
  if (!payoutRequestId) {
    return NextResponse.json({ error: 'payoutRequestId is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: payout, error: fetchError } = await db
    .from('payout_requests').select('*').eq('id', payoutRequestId).single()
  if (fetchError || !payout) {
    return NextResponse.json({ error: fetchError?.message ?? 'Payout request not found' }, { status: 404 })
  }
  if (!['pending', 'approved', 'failed'].includes((payout as any).status)) {
    return NextResponse.json({ error: `Payout is already ${(payout as any).status}` }, { status: 400 })
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({
      processed: false,
      reason: 'not_configured',
      message: 'PAYSTACK_SECRET_KEY is not set. Approve manually, settle off-platform, then mark this request Paid.',
    })
  }

  const { data: requester } = await db
    .from('app_users').select('paystack_recipient_code, payout_currency, display_name').eq('id', (payout as any).requester_user_id).single()
  const recipientCode = getDecryptedRecipientCode((requester as any)?.paystack_recipient_code)

  if (!recipientCode) {
    return NextResponse.json({
      processed: false,
      reason: 'no_recipient',
      message: 'This requester has no Paystack recipient code on file yet. Collect bank details, save paystack_recipient_code on their app_users row, then retry.',
    })
  }

  const currency = ((requester as any)?.payout_currency ?? 'NGN') as 'NGN' | 'USD'
  const fx = await convertUsdTo(Number((payout as any).amount_usd), currency)
  if (!fx.ok) {
    return NextResponse.json({ processed: false, reason: 'fx_unavailable', message: fx.message })
  }

  // Claim before touching Paystack — only succeeds from the states
  // checked above, so a concurrent request that already claimed this
  // row (moved it to 'processing') loses the race here instead of at
  // Paystack.
  const { data: claimed, error: claimError } = await (db as any)
    .from('payout_requests')
    .update({ status: 'processing' })
    .eq('id', payoutRequestId)
    .in('status', ['pending', 'approved', 'failed'])
    .select('id').maybeSingle()

  if (claimError || !claimed) {
    return NextResponse.json({
      processed: false,
      reason: 'already_processing',
      message: 'This payout is already being processed or was already settled.',
    }, { status: 409 })
  }

  const reference = `payout-${payoutRequestId}-${Date.now()}`
  const amountMinorUnits = Math.round(fx.amountSettled * 100)

  const result = await initiateTransfer({
    recipientCode,
    amountMinorUnits,
    reason: `WorkersHub payout — ${(payout as any).type}`,
    reference,
  })

  if (!result.ok) {
    await (db as any).from('payout_requests').update({ status: 'failed' }).eq('id', payoutRequestId)
    return NextResponse.json({
      processed: false,
      reason: result.reason,
      message: result.reason === 'request_failed' ? result.message : 'Paystack transfer failed.',
    }, { status: 502 })
  }

  // Confirm final status rather than trusting "accepted" alone (gap #3).
  const verify = await verifyTransfer(result.data.reference)
  const finalStatus = verify.ok && verify.data.status === 'success' ? 'paid'
    : verify.ok && (verify.data.status === 'failed' || verify.data.status === 'reversed') ? 'failed'
    : 'processing' // still pending confirmation — webhook or a later check resolves this

  await (db as any)
    .from('payout_requests')
    .update({
      status: finalStatus,
      paystack_reference: result.data.reference,
      paystack_transfer_code: result.data.transfer_code,
      currency: fx.currency,
      fx_rate: fx.rate,
      amount_settled: fx.amountSettled,
      processed_by: admin.id,
      processed_at: finalStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', payoutRequestId)

  await db.from('audit_log').insert({
    user_id: admin.id,
    action: 'payout_processed',
    entity_type: 'payout_requests',
    entity_id: payoutRequestId,
    details: {
      reference: result.data.reference, status: finalStatus, amount_usd: (payout as any).amount_usd,
      type: (payout as any).type, currency: fx.currency, fx_rate: fx.rate, amount_settled: fx.amountSettled,
    },
  })

  return NextResponse.json({
    processed: true,
    status: finalStatus,
    reference: result.data.reference,
    currency: fx.currency,
    amountSettled: fx.amountSettled,
    message: finalStatus === 'processing'
      ? 'Transfer accepted by Paystack, awaiting final confirmation.'
      : undefined,
  })
}
