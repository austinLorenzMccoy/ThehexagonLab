import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeColumnKey } from '@/lib/platform-utils'
import { assertAdmin } from '@/lib/api-admin-guard'

export const dynamic = 'force-dynamic'

// GET /api/admin/platforms/columns?platform_id=1 — all columns incl. inactive
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const platformId = Number(request.nextUrl.searchParams.get('platform_id'))
  if (!platformId || !Number.isFinite(platformId)) {
    return NextResponse.json({ error: 'platform_id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('platform_task_columns')
    .select('*')
    .eq('platform_id', platformId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ columns: data ?? [] })
}

// POST /api/admin/platforms/columns — add column or clone / reorder bulk ops
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  // ── Clone columns ──────────────────────────────────────────────
  if (body.action === 'clone') {
    const sourceId = Number(body.source_platform_id)
    const targetId = Number(body.target_platform_id)
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'source_platform_id and target_platform_id required' }, { status: 400 })
    }
    if (sourceId === targetId) {
      return NextResponse.json({ error: 'source and target must differ' }, { status: 400 })
    }

    const { data: sourceCols, error: srcErr } = await (admin as any)
      .from('platform_task_columns')
      .select('column_key, column_label, sort_order')
      .eq('platform_id', sourceId)
      .eq('is_active', true)
      .order('sort_order')

    if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 })

    const { data: existing } = await (admin as any)
      .from('platform_task_columns')
      .select('column_key')
      .eq('platform_id', targetId)

    const existingKeys = new Set(
      ((existing ?? []) as { column_key: string }[]).map((c) => c.column_key)
    )

    const rows = ((sourceCols ?? []) as Array<{
      column_key: string
      column_label: string
      sort_order: number
    }>)
      .filter((c) => !existingKeys.has(c.column_key))
      .map((c) => ({
        platform_id: targetId,
        column_key: c.column_key,
        column_label: c.column_label,
        sort_order: c.sort_order,
        is_active: true,
      }))

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0, message: 'No new columns to clone' })
    }

    const { error: insErr } = await (admin as any)
      .from('platform_task_columns')
      .insert(rows)

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    await (admin as any).from('audit_log').insert({
      user_id: adminUser.id,
      action: 'clone_task_columns',
      entity_type: 'platform',
      entity_id: String(targetId),
      details: { source_platform_id: sourceId, inserted: rows.length },
    })

    return NextResponse.json({ inserted: rows.length })
  }

  // ── Reorder ────────────────────────────────────────────────────
  if (body.action === 'reorder') {
    const platformId = Number(body.platform_id)
    const orderedIds: number[] = Array.isArray(body.ordered_ids)
      ? body.ordered_ids.map(Number)
      : []

    if (!platformId || orderedIds.length === 0) {
      return NextResponse.json({ error: 'platform_id and ordered_ids required' }, { status: 400 })
    }

    const updates = orderedIds.map((colId, index) =>
      (admin as any)
        .from('platform_task_columns')
        .update({ sort_order: index + 1 })
        .eq('id', colId)
        .eq('platform_id', platformId)
    )

    const results = await Promise.all(updates)
    const failed = results.find((r: { error: { message: string } | null }) => r.error)
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ── Create single column ───────────────────────────────────────
  const platformId = Number(body.platform_id)
  const columnLabel = typeof body.column_label === 'string' ? body.column_label.trim() : ''
  const columnKey = normalizeColumnKey(
    typeof body.column_key === 'string' && body.column_key.trim()
      ? body.column_key
      : columnLabel
  )

  if (!platformId || !columnLabel || !columnKey) {
    return NextResponse.json({
      error: 'platform_id and column_label are required',
    }, { status: 400 })
  }

  // Next sort_order
  const { data: maxRow } = await (admin as any)
    .from('platform_task_columns')
    .select('sort_order')
    .eq('platform_id', platformId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = body.sort_order != null
    ? Number(body.sort_order)
    : ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1

  const { data, error } = await (admin as any)
    .from('platform_task_columns')
    .insert({
      platform_id: platformId,
      column_key: columnKey,
      column_label: columnLabel,
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        error: `Column key "${columnKey}" already exists on this platform`,
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'create_task_column',
    entity_type: 'platform_task_column',
    entity_id: String(data.id),
    details: { platform_id: platformId, column_key: columnKey, column_label: columnLabel },
  })

  return NextResponse.json({ column: data }, { status: 201 })
}

// PATCH /api/admin/platforms/columns — update label, key, active, sort
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
  if (typeof body.column_label === 'string' && body.column_label.trim()) {
    updates.column_label = body.column_label.trim()
  }
  if (typeof body.column_key === 'string' && body.column_key.trim()) {
    updates.column_key = normalizeColumnKey(body.column_key)
  }
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active
  }
  if (body.sort_order != null && Number.isFinite(Number(body.sort_order))) {
    updates.sort_order = Number(body.sort_order)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('platform_task_columns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Column key already exists on this platform' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'update_task_column',
    entity_type: 'platform_task_column',
    entity_id: String(id),
    details: updates,
  })

  return NextResponse.json({ column: data })
}

// DELETE /api/admin/platforms/columns — soft (default) or hard delete
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

  if (hard) {
    const { error } = await (admin as any)
      .from('platform_task_columns')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await (admin as any).from('audit_log').insert({
      user_id: adminUser.id,
      action: 'delete_task_column',
      entity_type: 'platform_task_column',
      entity_id: String(id),
      details: { hard: true },
    })

    return NextResponse.json({ success: true, hard: true })
  }

  const { data, error } = await (admin as any)
    .from('platform_task_columns')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'deactivate_task_column',
    entity_type: 'platform_task_column',
    entity_id: String(id),
    details: { hard: false },
  })

  return NextResponse.json({ column: data, soft: true })
}
