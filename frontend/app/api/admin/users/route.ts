import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

// PATCH /api/admin/users — Update a user's role, platform access, order visibility, or active status
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { userId, role, platform_access, can_view_orders, worker_id, is_active } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // Deactivate/reactivate only (no role change)
  if (is_active !== undefined && !role) {
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 })
    }
    const { error } = await (createAdminClient() as any)
      .from('app_users').update({ is_active }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log
    await createAdminClient().from('audit_log').insert({
      user_id: adminUser.id,
      action: is_active ? 'activate_user' : 'deactivate_user',
      entity_type: 'user',
      entity_id: userId,
      details: { is_active },
    })

    return NextResponse.json({ success: true })
  }

  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 })
  }

  if (userId === adminUser.id && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updates = {
    role,
    platform_access:  role === 'admin' ? null : (platform_access ?? []),
    can_view_orders:  role === 'admin' ? true : (can_view_orders ?? false),
    ...(worker_id !== undefined ? { worker_id } : {}),
    ...(is_active !== undefined ? { is_active } : {}),
  }

  const { error } = await (createAdminClient() as any)
    .from('app_users').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log
  await createAdminClient().from('audit_log').insert({
    user_id: adminUser.id,
    action: 'role_change',
    entity_type: 'user',
    entity_id: userId,
    details: { new_role: role, platform_access: updates.platform_access, can_view_orders: updates.can_view_orders },
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/users — Permanently delete a user (admin only)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (userId === adminUser.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Delete from app_users table first
  const { error: dbError } = await (admin as any)
    .from('app_users').delete().eq('id', userId)
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Also delete from Supabase Auth
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) {
    // User removed from app_users but auth delete failed — log but don't fail
    console.error('Auth user delete failed:', authError.message)
  }

  // Audit log
  await createAdminClient().from('audit_log').insert({
    user_id: adminUser.id,
    action: 'delete',
    entity_type: 'user',
    entity_id: userId,
    details: { deleted: true },
  })

  return NextResponse.json({ success: true })
}
