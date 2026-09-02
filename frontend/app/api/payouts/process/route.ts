import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initiateTransfer, isPaystackConfigured } from '@/lib/paystack'
import { getDecryptedRecipientCode } from '@/lib/crypto'
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
 * See doc/backend_wiring_guide.md for the equivalent Supabase wiring
 * pattern this follows.
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
  if ((payout as any).status !== 'approved' && (payout as any).status !== 'pending') {
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
    .from('app_users').select('paystack_recipient_code, display_name').eq('id', (payout as any).requester_user_id).single()
  const recipientCode = getDecryptedRecipientCode((requester as any)?.paystack_recipient_code)

  if (!recipientCode) {
    return NextResponse.json({
      processed: false,
      reason: 'no_recipient',
      message: 'This requester has no Paystack recipient code on file yet. Collect bank details, save paystack_recipient_code on their app_users row, then retry.',
    })
  }

  const amountMinorUnits = Math.round(Number((payout as any).amount_usd) * 100)
  const reference = `payout-${payoutRequestId}`

  const result = await initiateTransfer({
    recipientCode,
    amountMinorUnits,
    reason: `WorkersHub payout — ${(payout as any).type}`,
    reference,
  })

  if (!result.ok) {
    return NextResponse.json({
      processed: false,
      reason: result.reason,
      message: result.reason === 'request_failed' ? result.message : 'Paystack transfer failed.',
    }, { status: 502 })
  }

  await (db as any)
    .from('payout_requests')
    .update({
      status: 'paid',
      paystack_reference: result.data.reference,
      processed_by: admin.id,
      processed_at: new Date().toISOString(),
    })
    .eq('id', payoutRequestId)

  await db.from('audit_log').insert({
    user_id: admin.id,
    action: 'payout_processed',
    entity_type: 'payout_requests',
    entity_id: payoutRequestId,
    details: { reference: result.data.reference, amount_usd: (payout as any).amount_usd, type: (payout as any).type },
  })

  return NextResponse.json({ processed: true, reference: result.data.reference })
}
