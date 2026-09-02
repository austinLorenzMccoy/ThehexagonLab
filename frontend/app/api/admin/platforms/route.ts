import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  emptyUsage,
  isValidPlatformSlug,
  normalizeColumnKey,
  slugifyPlatformLabel,
  type PlatformUsage,
} from '@/lib/platform-utils'
import { assertAdmin } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

async function loadUsage(admin: ReturnType<typeof createAdminClient>, platformId: number): Promise<PlatformUsage> {
  const usage = emptyUsage()
  const id = platformId

  const tables: Array<keyof Pick<PlatformUsage, 'tracker' | 'registry' | 'orders' | 'payroll' | 'onboarding'>> = [
    'tracker', 'registry', 'orders', 'payroll', 'onboarding',
  ]
  const tableMap: Record<string, string> = {
    tracker: 'worker_tracker',
    registry: 'workers_registry',
    orders: 'orders',
    payroll: 'payroll',
    onboarding: 'onboarding',
  }

  await Promise.all(
    tables.map(async (key) => {
      const { count, error } = await (admin as any)
        .from(tableMap[key])
        .select('*', { count: 'exact', head: true })
        .eq('platform_id', id)
      if (!error && typeof count === 'number') usage[key] = count
    })
  )

  const { count: colCount } = await (admin as any)
    .from('platform_task_columns')
    .select('*', { count: 'exact', head: true })
    .eq('platform_id', id)
  usage.columns = colCount ?? 0

  const { count: activeColCount } = await (admin as any)
    .from('platform_task_columns')
    .select('*', { count: 'exact', head: true })
    .eq('platform_id', id)
    .eq('is_active', true)
  usage.active_columns = activeColCount ?? 0

  return usage
}

// GET /api/admin/platforms — all platforms (incl. inactive) + usage
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('platforms')
    .select('*')
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const platforms = (data ?? []) as Array<{ id: number; slug: string; label: string; icon: string; color_hex: string; is_active: boolean }>
  const usageEntries = await Promise.all(
    platforms.map(async (p) => [p.id, await loadUsage(admin, p.id)] as const)
  )
  const usage = Object.fromEntries(usageEntries) as Record<number, PlatformUsage>

  return NextResponse.json({ platforms, usage })
}

// POST /api/admin/platforms — create platform (+ optional columns / clone)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : '🔷'
  const color_hex = typeof body.color_hex === 'string' && body.color_hex.trim()
    ? body.color_hex.trim()
    : '#6366F1'
  const rawSlug = typeof body.slug === 'string' && body.slug.trim()
    ? body.slug.trim().toLowerCase()
    : slugifyPlatformLabel(label)
  const cloneFromId = body.clone_from_platform_id != null
    ? Number(body.clone_from_platform_id)
    : null
  const taskColumns: Array<{ column_key: string; column_label: string }> = Array.isArray(body.task_columns)
    ? body.task_columns
    : []

  if (!label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 })
  }
  if (!isValidPlatformSlug(rawSlug)) {
    return NextResponse.json({
      error: 'slug must start with a letter and contain only lowercase letters, numbers, underscores',
    }, { status: 400 })
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color_hex)) {
    return NextResponse.json({ error: 'color_hex must be a #RRGGBB value' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: platform, error } = await (admin as any)
    .from('platforms')
    .insert({
      slug: rawSlug,
      label,
      icon,
      color_hex,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Platform slug "${rawSlug}" already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let columnsInserted = 0

  // Clone columns from another platform
  if (cloneFromId && Number.isFinite(cloneFromId)) {
    const { data: sourceCols, error: srcErr } = await (admin as any)
      .from('platform_task_columns')
      .select('column_key, column_label, sort_order')
      .eq('platform_id', cloneFromId)
      .eq('is_active', true)
      .order('sort_order')

    if (srcErr) {
      return NextResponse.json({
        platform,
        warning: `Platform created but clone failed: ${srcErr.message}`,
      }, { status: 201 })
    }

    if (sourceCols?.length) {
      const rows = sourceCols.map((c: { column_key: string; column_label: string; sort_order: number }) => ({
        platform_id: platform.id,
        column_key: c.column_key,
        column_label: c.column_label,
        sort_order: c.sort_order,
        is_active: true,
      }))
      const { error: insErr, count } = await (admin as any)
        .from('platform_task_columns')
        .insert(rows)
        .select('id', { count: 'exact' })
      if (!insErr) columnsInserted = count ?? rows.length
    }
  } else if (taskColumns.length > 0) {
    const rows = taskColumns
      .map((c, i) => {
        const key = normalizeColumnKey(c.column_key || c.column_label || '')
        const colLabel = (c.column_label || c.column_key || '').trim()
        if (!key || !colLabel) return null
        return {
          platform_id: platform.id,
          column_key: key,
          column_label: colLabel,
          sort_order: i + 1,
          is_active: true,
        }
      })
      .filter(Boolean)

    if (rows.length) {
      const { error: insErr } = await (admin as any)
        .from('platform_task_columns')
        .insert(rows)
      if (!insErr) columnsInserted = rows.length
    }
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'create_platform',
    entity_type: 'platform',
    entity_id: String(platform.id),
    details: {
      slug: platform.slug,
      label: platform.label,
      clone_from: cloneFromId,
      columns_inserted: columnsInserted,
    },
  })

  return NextResponse.json({ platform, columns_inserted: columnsInserted }, { status: 201 })
}

// PATCH /api/admin/platforms — update platform fields
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const id = Number(body.id)
  if (!id || !Number.isFinite(id)) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.label === 'string' && body.label.trim()) {
    updates.label = body.label.trim()
  }
  if (typeof body.icon === 'string' && body.icon.trim()) {
    updates.icon = body.icon.trim()
  }
  if (typeof body.color_hex === 'string') {
    if (!/^#[0-9A-Fa-f]{6}$/.test(body.color_hex.trim())) {
      return NextResponse.json({ error: 'color_hex must be a #RRGGBB value' }, { status: 400 })
    }
    updates.color_hex = body.color_hex.trim()
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }
  if (typeof body.slug === 'string' && body.slug.trim()) {
    const slug = body.slug.trim().toLowerCase()
    if (!isValidPlatformSlug(slug)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
    }
    updates.slug = slug
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()

  // If renaming slug, migrate platform_access arrays on app_users
  if (typeof updates.slug === 'string') {
    const { data: existing } = await (admin as any)
      .from('platforms')
      .select('slug')
      .eq('id', id)
      .single()
    const oldSlug = (existing as { slug?: string } | null)?.slug
    if (oldSlug && oldSlug !== updates.slug) {
      const { data: users } = await (admin as any)
        .from('app_users')
        .select('id, platform_access')
        .not('platform_access', 'is', null)

      for (const u of (users ?? []) as Array<{ id: string; platform_access: string[] | null }>) {
        const access = u.platform_access
        if (!access?.includes(oldSlug)) continue
        const next = access.map((s) => (s === oldSlug ? updates.slug as string : s))
        await (admin as any)
          .from('app_users')
          .update({ platform_access: next })
          .eq('id', u.id)
      }
    }
  }

  const { data, error } = await (admin as any)
    .from('platforms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'update_platform',
    entity_type: 'platform',
    entity_id: String(id),
    details: updates,
  })

  return NextResponse.json({ platform: data })
}

// DELETE /api/admin/platforms — soft-delete (default) or hard-delete if empty
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const id = Number(body.id)
  const hard = Boolean(body.hard)

  if (!id || !Number.isFinite(id)) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const usage = await loadUsage(admin, id)
  const hasData =
    usage.tracker + usage.registry + usage.orders + usage.payroll + usage.onboarding > 0

  if (hard) {
    if (hasData) {
      return NextResponse.json({
        error: 'Cannot permanently delete a platform that still has worker/order/payroll data. Deactivate it instead.',
        usage,
      }, { status: 409 })
    }

    // Task columns cascade via FK
    const { error } = await (admin as any).from('platforms').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await (admin as any).from('audit_log').insert({
      user_id: adminUser.id,
      action: 'delete_platform',
      entity_type: 'platform',
      entity_id: String(id),
      details: { hard: true },
    })

    return NextResponse.json({ success: true, hard: true })
  }

  // Soft delete
  const { data, error } = await (admin as any)
    .from('platforms')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'deactivate_platform',
    entity_type: 'platform',
    entity_id: String(id),
    details: { hard: false, usage },
  })

  return NextResponse.json({ platform: data, soft: true })
}
