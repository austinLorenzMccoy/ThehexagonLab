import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/api-admin-guard'
import type { ProjectStatus } from '@/types'

export const dynamic = 'force-dynamic'

const PROJECT_STATUSES: ProjectStatus[] = ['✅ Passed', '🔍 Under Review', '❌ Failed', '⏳ Pending']

function isValidStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as string[]).includes(value)
}

// GET /api/admin/platforms/projects?platform_id=1 — all projects incl. inactive
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
    .from('projects')
    .select('*')
    .eq('platform_id', platformId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data ?? [] })
}

// POST /api/admin/platforms/projects — create project, or reorder
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const adminUser = await assertAdmin(supabase)
  if (!adminUser) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  // ── Reorder ────────────────────────────────────────────────────
  if (body.action === 'reorder') {
    const platformId = Number(body.platform_id)
    const orderedIds: number[] = Array.isArray(body.ordered_ids)
      ? body.ordered_ids.map(Number)
      : []

    if (!platformId || orderedIds.length === 0) {
      return NextResponse.json({ error: 'platform_id and ordered_ids required' }, { status: 400 })
    }

    const updates = orderedIds.map((projectId, index) =>
      (admin as any)
        .from('projects')
        .update({ sort_order: index + 1 })
        .eq('id', projectId)
        .eq('platform_id', platformId)
    )

    const results = await Promise.all(updates)
    const failed = results.find((r: { error: { message: string } | null }) => r.error)
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ── Create single project ──────────────────────────────────────
  const platformId = Number(body.platform_id)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const status: ProjectStatus = isValidStatus(body.status) ? body.status : '⏳ Pending'

  if (!platformId || !name) {
    return NextResponse.json({ error: 'platform_id and name are required' }, { status: 400 })
  }

  // Next sort_order
  const { data: maxRow } = await (admin as any)
    .from('projects')
    .select('sort_order')
    .eq('platform_id', platformId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = body.sort_order != null
    ? Number(body.sort_order)
    : ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1

  const { data, error } = await (admin as any)
    .from('projects')
    .insert({
      platform_id: platformId,
      name,
      status,
      sort_order: sortOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        error: `Project "${name}" already exists on this platform`,
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'create_project',
    entity_type: 'project',
    entity_id: String(data.id),
    details: { platform_id: platformId, name, status },
  })

  return NextResponse.json({ project: data }, { status: 201 })
}

// PATCH /api/admin/platforms/projects — update name, status, active, sort
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
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim()
  }
  if (body.status !== undefined) {
    if (!isValidStatus(body.status)) {
      return NextResponse.json({
        error: `status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      }, { status: 400 })
    }
    updates.status = body.status
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
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A project with that name already exists on this platform' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'update_project',
    entity_type: 'project',
    entity_id: String(id),
    details: updates,
  })

  return NextResponse.json({ project: data })
}

// DELETE /api/admin/platforms/projects — soft (default) or hard delete
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
      .from('projects')
      .delete()
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await (admin as any).from('audit_log').insert({
      user_id: adminUser.id,
      action: 'delete_project',
      entity_type: 'project',
      entity_id: String(id),
      details: { hard: true },
    })

    return NextResponse.json({ success: true, hard: true })
  }

  const { data, error } = await (admin as any)
    .from('projects')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await (admin as any).from('audit_log').insert({
    user_id: adminUser.id,
    action: 'deactivate_project',
    entity_type: 'project',
    entity_id: String(id),
    details: { hard: false },
  })

  return NextResponse.json({ project: data, soft: true })
}
