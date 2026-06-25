import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH /api/tracker/task — Merge a single key into task_statuses JSONB
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { rowId, columnKey, newStatus } = await request.json()
  if (!rowId || !columnKey || !newStatus) {
    return NextResponse.json({ error: 'Missing required fields: rowId, columnKey, newStatus' }, { status: 400 })
  }

  const VALID_STATUSES = ['✅ Yes', '❌ No', '⏳ Pending', '🔄 In Progress', '➖ N/A']
  if (!VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status value. Allowed: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: row, error: readErr } = await sb
    .from('worker_tracker').select('task_statuses').eq('id', rowId).single()
  if (readErr || !row) {
    return NextResponse.json({ error: readErr?.message ?? 'Row not found' }, { status: 404 })
  }

  const merged = { ...(row.task_statuses as Record<string, string> ?? {}), [columnKey]: newStatus }
  const { error } = await sb
    .from('worker_tracker').update({ task_statuses: merged }).eq('id', rowId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, merged })
}
