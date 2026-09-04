import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin, isDemoPreview } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/users/invite — admin-only. Provisions a real account
 * for someone who was only an operational record until now (a Registry
 * worker or a Partner Contacts referrer), so a Paystack payout code can
 * be attached to them right away instead of waiting for their first
 * sign-in. Uses `auth.admin.createUser` with `email_confirm: true` and
 * no password — this person still signs in with Google like everyone
 * else; Supabase auto-links a later Google identity to this account
 * because the email is already confirmed and matches. The
 * `on_auth_user_created` trigger fires exactly as it would on a real
 * first sign-in, so the resulting app_users row starts as role='worker'
 * with this display name — an admin finishes role/platform setup
 * afterward on Admin > Manage Users, same as for anyone else.
 */
export async function POST(request: NextRequest) {
  if (await isDemoPreview()) {
    return NextResponse.json({ error: 'Cannot create accounts in preview mode' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { email, displayName } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: displayName ? { full_name: displayName } : undefined,
  })

  if (error || !data.user) {
    const isDuplicate = error?.message?.toLowerCase().includes('already') ?? false
    return NextResponse.json({
      error: isDuplicate ? 'An account with this email already exists' : (error?.message ?? 'Could not create account'),
    }, { status: isDuplicate ? 409 : 500 })
  }

  await db.from('audit_log').insert({
    user_id: admin.id,
    action: 'account_provisioned',
    entity_type: 'user',
    entity_id: data.user.id,
    details: { email, display_name: displayName ?? null },
  })

  return NextResponse.json({ userId: data.user.id })
}
