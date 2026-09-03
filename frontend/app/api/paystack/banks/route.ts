import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { listBanks, isPaystackConfigured } from '@/lib/paystack'
import { assertAdmin } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/paystack/banks — admin-only. Feeds the bank picker in the
 * recipient-creation form (Control Tower) — see
 * doc/paystack_integration_guide.md gap #1. Optional `?currency=`
 * narrows the list (Paystack's `/bank` endpoint filters by currency).
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY is not set' }, { status: 400 })
  }

  const currency = request.nextUrl.searchParams.get('currency') ?? undefined
  const result = await listBanks({ country: 'nigeria', currency })
  if (!result.ok) {
    return NextResponse.json({
      error: result.reason === 'request_failed' ? result.message : 'Could not reach Paystack.',
    }, { status: 502 })
  }
  return NextResponse.json(result.data)
}
