import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function assertAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  return (data as any)?.role === 'admin' ? user : null
}

// GET /api/admin/users — Returns list of all users (admin only)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const admin = await assertAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { data, error } = await createAdminClient()
    .from('app_users').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/admin/users — Update a user's role, platform access, or order visibility
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { userId, role, platform_access, can_view_orders, worker_id } = await request.json()

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  if (userId === adminUser.id && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updates = {
    role,
    platform_access:  role === 'admin' ? null : (platform_access ?? []),
    can_view_orders:  role === 'admin' ? true : (can_view_orders ?? false),
    ...(worker_id !== undefined ? { worker_id } : {}),
  }

  const { error } = await (createAdminClient() as any)
    .from('app_users').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
