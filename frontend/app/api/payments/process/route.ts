import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initiateTransfer, verifyTransfer, isPaystackConfigured } from '@/lib/paystack'
import { getDecryptedRecipientCode } from '@/lib/crypto'
import { convertUsdTo } from '@/lib/fx'
import { assertAdminOrManager, isDemoPreview } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/process — admin or manager. Settles a worker's
 * month-end salary for a given pay slip via Paystack Transfer,
 * per doc/Worker_Recovery_System_PRD.md §4.3 step 2 ("Actual payment
 * is processed via Paystack and credited to the worker's account").
 *
 * Degrades gracefully — same pattern as /api/payouts/process — when
 * Paystack isn't configured or the worker has no recipient code on
 * file, so an admin or manager is never blocked from marking a slip
 * paid.
 *
 * Claims the slip (inserts a 'processing' payments row, guarded by
 * idx_payments_one_active_per_slip) BEFORE calling Paystack, so two
 * concurrent "Mark Paid" clicks can't both fire a real transfer — see
 * doc/paystack_integration_guide.md gap #4. Converts the nominal USD
 * amount to the worker's requested payout_currency (gap #2), and
 * confirms the transfer's actual status via verifyTransfer() instead
 * of trusting the initial "accepted" response alone (gap #3) — a
 * transfer that verifies as still pending stays 'processing' until
 * the /api/webhooks/paystack endpoint (or a later retry) resolves it.
 */
export async function POST(request: NextRequest) {
  if (await isDemoPreview()) {
    return NextResponse.json({ error: 'Payments cannot be processed in preview mode' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const actor = await assertAdminOrManager(supabase)
  if (!actor) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { paySlipId } = await request.json()
  if (!paySlipId) {
    return NextResponse.json({ error: 'paySlipId is required' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: slip, error: fetchError } = await db
    .from('pay_slips').select('*').eq('id', paySlipId).single()
  if (fetchError || !slip) {
    return NextResponse.json({ error: fetchError?.message ?? 'Pay slip not found' }, { status: 404 })
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({
      processed: false,
      reason: 'not_configured',
      message: 'PAYSTACK_SECRET_KEY is not set. Settle off-platform, then mark this pay slip Paid.',
    })
  }

  const { data: worker } = await db
    .from('app_users').select('paystack_recipient_code, payout_currency').eq('id', (slip as any).worker_user_id).single()
  const recipientCode = getDecryptedRecipientCode((worker as any)?.paystack_recipient_code)

  if (!recipientCode) {
    return NextResponse.json({
      processed: false,
      reason: 'no_recipient',
      message: 'This worker has no Paystack recipient code on file yet. Set it in Control Tower, then retry.',
    })
  }

  const currency = ((worker as any)?.payout_currency ?? 'NGN') as 'NGN' | 'USD'
  const fx = await convertUsdTo(Number((slip as any).expected_amount_usd), currency)
  if (!fx.ok) {
    return NextResponse.json({ processed: false, reason: 'fx_unavailable', message: fx.message })
  }

  // Claim the slip before touching Paystack — the unique index rejects
  // a concurrent claim for the same pay_slip_id outright.
  const { data: claimed, error: claimError } = await (db as any)
    .from('payments')
    .insert({
      worker_user_id: (slip as any).worker_user_id,
      pay_slip_id: paySlipId,
      amount_usd: (slip as any).expected_amount_usd,
      status: 'processing',
      method: 'paystack',
      currency: fx.currency,
      fx_rate: fx.rate,
      amount_settled: fx.amountSettled,
    })
    .select('id').single()

  if (claimError) {
    const reason = claimError.code === '23505' ? 'already_paid' : 'record_failed'
    return NextResponse.json({
      processed: false,
      reason,
      message: claimError.code === '23505'
        ? 'This pay slip is already paid or has a payment in progress.'
        : `Could not claim this pay slip for payment: ${claimError.message}`,
    }, { status: 409 })
  }

  const paymentId = (claimed as any).id
  const reference = `payslip-${paySlipId}-${paymentId}`
  const amountMinorUnits = Math.round(fx.amountSettled * 100)

  const result = await initiateTransfer({
    recipientCode,
    amountMinorUnits,
    reason: `WorkersHub salary — ${(slip as any).period_month} ${(slip as any).period_year}`,
    reference,
  })

  if (!result.ok) {
    await (db as any).from('payments').update({ status: 'failed' }).eq('id', paymentId)
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
    .from('payments')
    .update({
      status: finalStatus,
      paystack_reference: result.data.reference,
      paystack_transfer_code: result.data.transfer_code,
      paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', paymentId)

  await db.from('audit_log').insert({
    user_id: actor.id,
    action: 'payment_processed',
    entity_type: 'payments',
    entity_id: paymentId,
    details: {
      pay_slip_id: paySlipId, reference: result.data.reference, status: finalStatus,
      amount_usd: (slip as any).expected_amount_usd, currency: fx.currency,
      fx_rate: fx.rate, amount_settled: fx.amountSettled,
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
