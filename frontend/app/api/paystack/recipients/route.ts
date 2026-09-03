import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createTransferRecipient, isPaystackConfigured } from '@/lib/paystack'
import { encryptField } from '@/lib/crypto'
import { assertAdmin, isDemoPreview } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * POST /api/paystack/recipients — admin-only. Creates a Paystack
 * Transfer Recipient for a worker/referrer's bank account and saves
 * the resulting recipient_code (encrypted) on their app_users row —
 * closes doc/paystack_integration_guide.md gap #1, replacing the
 * manual curl step documented there. Uses the target user's own
 * payout_currency preference (set by them, see command-strip.tsx) as
 * the recipient's settlement currency.
 */
export async function POST(request: NextRequest) {
  if (await isDemoPreview()) {
    return NextResponse.json({ error: 'Cannot create Paystack recipients in preview mode' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { userId, accountName, accountNumber, bankCode } = await request.json()
  if (!userId || !accountName || !accountNumber || !bankCode) {
    return NextResponse.json({ error: 'userId, accountName, accountNumber, and bankCode are required' }, { status: 400 })
  }

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not set' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: user, error: userError } = await db
    .from('app_users').select('role, payout_currency').eq('id', userId).single()
  if (userError || !user) {
    return NextResponse.json({ error: userError?.message ?? 'User not found' }, { status: 404 })
  }
  if ((user as any).role !== 'worker' && (user as any).role !== 'referrer') {
    return NextResponse.json({ error: 'Paystack recipients are only for workers and referrers' }, { status: 400 })
  }

  const currency = (user as any).payout_currency ?? 'NGN'
  const result = await createTransferRecipient({
    name: accountName,
    accountNumber,
    bankCode,
    currency,
  })
  if (!result.ok) {
    return NextResponse.json({
      error: result.reason === 'request_failed' ? result.message : 'Paystack rejected this recipient.',
    }, { status: 502 })
  }

  const { error: updateError } = await (db as any)
    .from('app_users')
    .update({ paystack_recipient_code: encryptField(result.data.recipient_code) })
    .eq('id', userId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await db.from('audit_log').insert({
    user_id: admin.id,
    action: 'set_payout_code',
    entity_type: 'user',
    entity_id: userId,
    details: { has_code: true, via: 'paystack_api', currency },
  })

  return NextResponse.json({ success: true })
}
