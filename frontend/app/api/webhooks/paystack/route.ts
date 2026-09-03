import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/paystack'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/paystack — Paystack calls this directly (no user
 * session), so auth is the HMAC signature header instead of a login
 * check. Reconciles async transfer.success / transfer.failed /
 * transfer.reversed events against the payments/payout_requests row a
 * 'processing' claim was made for — closes
 * doc/paystack_integration_guide.md gap #3. Idempotent: only touches
 * rows still 'processing', so a retried delivery of the same event is
 * a harmless no-op the second time.
 *
 * Register this URL (https://<your-domain>/api/webhooks/paystack) in
 * the Paystack Dashboard under Settings → API Keys & Webhooks.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event?.event as string | undefined
  const transferCode = event?.data?.transfer_code as string | undefined
  const reference = event?.data?.reference as string | undefined

  const newStatus =
    eventType === 'transfer.success' ? 'paid'
    : (eventType === 'transfer.failed' || eventType === 'transfer.reversed') ? 'failed'
    : null

  if (!newStatus || (!transferCode && !reference)) {
    return NextResponse.json({ received: true })
  }

  const db = createAdminClient()
  const match = transferCode
    ? { column: 'paystack_transfer_code', value: transferCode }
    : { column: 'paystack_reference', value: reference as string }

  await (db as any)
    .from('payments')
    .update({ status: newStatus, paid_at: newStatus === 'paid' ? new Date().toISOString() : null })
    .eq(match.column, match.value)
    .eq('status', 'processing')

  await (db as any)
    .from('payout_requests')
    .update({ status: newStatus, processed_at: newStatus === 'paid' ? new Date().toISOString() : null })
    .eq(match.column, match.value)
    .eq('status', 'processing')

  await db.from('audit_log').insert({
    user_id: null,
    action: 'paystack_webhook',
    entity_type: 'payments',
    entity_id: transferCode ?? reference ?? null,
    details: { event: eventType, transfer_code: transferCode, reference },
  })

  return NextResponse.json({ received: true })
}
