import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveAccountNumber, isPaystackConfigured } from '@/lib/paystack'
import { assertAdmin } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/paystack/resolve-account — admin-only. Looks up the real
 * account holder name for a bank account + code before a transfer
 * recipient is created (see lib/paystack.ts resolveAccountNumber),
 * so the recipient-creation form can catch a mistyped account number
 * instead of silently creating a recipient for the wrong person.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not set' }, { status: 400 })
  }

  const accountNumber = request.nextUrl.searchParams.get('accountNumber')
  const bankCode = request.nextUrl.searchParams.get('bankCode')
  if (!accountNumber || !bankCode) {
    return NextResponse.json({ error: 'accountNumber and bankCode are required' }, { status: 400 })
  }

  const result = await resolveAccountNumber({ accountNumber, bankCode })
  if (!result.ok) {
    return NextResponse.json({
      error: result.reason === 'request_failed' ? result.message : 'Could not reach Paystack.',
    }, { status: 502 })
  }
  return NextResponse.json(result.data)
}
