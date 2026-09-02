import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { initiateTransfer, isPaystackConfigured } from '@/lib/paystack'
import { getDecryptedRecipientCode } from '@/lib/crypto'
import { assertAdmin, isDemoPreview } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/process — admin-only. Settles a worker's
 * month-end salary for a given pay slip via Paystack Transfer,
 * per doc/Worker_Recovery_System_PRD.md §4.3 step 2 ("Actual payment
 * is processed via Paystack and credited to the worker's account").
 * Creates the `payments` row this route was previously missing.
 *
 * Degrades gracefully — same pattern as /api/payouts/process — when
 * Paystack isn't configured or the worker has no recipient code on
 * file, so an admin is never blocked from marking a slip paid.
 */
export async function POST(request: NextRequest) {
  if (await isDemoPreview()) {
    return NextResponse.json({ error: 'Payments cannot be processed in preview mode' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

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

  const { data: existingPaid } = await db
    .from('payments').select('id').eq('pay_slip_id', paySlipId).eq('status', 'paid').maybeSingle()
  if (existingPaid) {
    return NextResponse.json({ error: 'This pay slip has already been paid' }, { status: 400 })
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({
      processed: false,
      reason: 'not_configured',
      message: 'PAYSTACK_SECRET_KEY is not set. Settle off-platform, then mark this pay slip Paid.',
    })
  }

  const { data: worker } = await db
    .from('app_users').select('paystack_recipient_code').eq('id', (slip as any).worker_user_id).single()
  const recipientCode = getDecryptedRecipientCode((worker as any)?.paystack_recipient_code)

  if (!recipientCode) {
    return NextResponse.json({
      processed: false,
      reason: 'no_recipient',
      message: 'This worker has no Paystack recipient code on file yet. Set it in Control Tower, then retry.',
    })
  }

  const amountMinorUnits = Math.round(Number((slip as any).expected_amount_usd) * 100)
  const reference = `payslip-${paySlipId}`

  const result = await initiateTransfer({
    recipientCode,
    amountMinorUnits,
    reason: `Salary — ${(slip as any).period_month} ${(slip as any).period_year}`,
    reference,
  })

  if (!result.ok) {
    return NextResponse.json({
      processed: false,
      reason: result.reason,
      message: result.reason === 'request_failed' ? result.message : 'Paystack transfer failed.',
    }, { status: 502 })
  }

  const { data: payment, error: insertError } = await (db as any)
    .from('payments')
    .insert({
      worker_user_id: (slip as any).worker_user_id,
      pay_slip_id: paySlipId,
      amount_usd: (slip as any).expected_amount_usd,
      status: 'paid',
      method: 'paystack',
      paystack_reference: result.data.reference,
      paid_at: new Date().toISOString(),
    })
    .select('id').single()

  if (insertError) {
    // The Paystack transfer above already succeeded — money has moved.
    // A unique-violation here (23505) means a concurrent request already
    // recorded this slip as paid; surface that clearly instead of
    // silently reporting success or swallowing the error.
    const reason = insertError.code === '23505' ? 'already_paid' : 'record_failed'
    return NextResponse.json({
      processed: false,
      reason,
      message: insertError.code === '23505'
        ? 'A payment for this pay slip was already recorded (likely a duplicate click). The Paystack transfer may have already gone through — verify in your Paystack dashboard before retrying.'
        : `Paystack transfer succeeded but recording it failed: ${insertError.message}. Verify in your Paystack dashboard.`,
    }, { status: 409 })
  }

  await db.from('audit_log').insert({
    user_id: admin.id,
    action: 'payment_processed',
    entity_type: 'payments',
    entity_id: (payment as any)?.id ?? null,
    details: { pay_slip_id: paySlipId, reference: result.data.reference, amount_usd: (slip as any).expected_amount_usd },
  })

  return NextResponse.json({ processed: true, reference: result.data.reference })
}
