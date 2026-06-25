/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * lib/db.ts — Unified database access layer.
 * All Supabase queries are centralised here. UI components never call Supabase directly.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  AppUser, WorkerTrackerRow, WorkerRegistryRow,
  OrderRow, PayrollRow, Platform, PlatformTaskColumn,
  PlatformStatsRow, TaskStatusHistoryRow,
} from '@/types'

// ── Platforms ───────────────────────────────────────────────────

export async function fetchPlatforms(): Promise<Platform[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('platforms').select('*').eq('is_active', true).order('id')
  if (error) { console.error('fetchPlatforms:', error.message); return [] }
  return (data ?? []) as Platform[]
}

export async function fetchPlatformTaskColumns(platformSlug: string): Promise<PlatformTaskColumn[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('platform_task_columns')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .eq('is_active', true)
    .order('sort_order')
  if (error) { console.error('fetchPlatformTaskColumns:', error.message); return [] }
  return (data ?? []) as PlatformTaskColumn[]
}

export async function fetchPlatformStats(): Promise<PlatformStatsRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('platform_stats').select('*').order('total_workers', { ascending: false })
  if (error) { console.error('fetchPlatformStats:', error.message); return [] }
  return (data ?? []) as PlatformStatsRow[]
}

// ── Worker tracker ──────────────────────────────────────────────

export async function fetchTrackerByPlatform(
  platformSlug: string,
  filters?: { warningLevel?: string; linker?: string; search?: string }
): Promise<WorkerTrackerRow[]> {
  const supabase = createClient()
  let query = (supabase as any)
    .from('worker_tracker')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('created_at')

  if (filters?.warningLevel) query = query.eq('warning_level', filters.warningLevel)
  if (filters?.linker)       query = query.eq('linker', filters.linker)
  if (filters?.search) {
    query = query.or(
      `worker_name.ilike.%${filters.search}%,owner_name.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) { console.error('fetchTrackerByPlatform:', error.message); return [] }
  return (data ?? []) as WorkerTrackerRow[]
}

export async function updateTrackerField(
  rowId: string, field: string, value: string
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('worker_tracker').update({ [field]: value }).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function updateTaskStatus(
  rowId: string, columnKey: string, newStatus: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data: row, error: readErr } = await supabase
    .from('worker_tracker').select('task_statuses').eq('id', rowId).single()
  if (readErr) return { error: readErr.message }

  const current = (row as any)?.task_statuses as Record<string, string> | null
  const merged = { ...(current ?? {}), [columnKey]: newStatus }
  const { error } = await (supabase as any)
    .from('worker_tracker').update({ task_statuses: merged }).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function insertTrackerRow(
  row: Omit<WorkerTrackerRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_tracker').insert(row as any).select('id').single()
  return { id: (data as any)?.id ?? null, error: error?.message ?? null }
}

export async function deleteTrackerRow(rowId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('worker_tracker').delete().eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function fetchTaskHistory(rowId: string): Promise<TaskStatusHistoryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('task_status_history')
    .select('*').eq('tracker_row_id', rowId)
    .order('changed_at', { ascending: false }).limit(50)
  if (error) { console.error('fetchTaskHistory:', error.message); return [] }
  return (data ?? []) as any as TaskStatusHistoryRow[]
}

// ── Workers registry ────────────────────────────────────────────

export async function fetchRegistryByPlatform(platformSlug: string): Promise<WorkerRegistryRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('workers_registry')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('date_started', { ascending: false })
  if (error) { console.error('fetchRegistryByPlatform:', error.message); return [] }
  return (data ?? []) as WorkerRegistryRow[]
}

export async function insertRegistryRow(
  row: Omit<WorkerRegistryRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('workers_registry').insert(row as any).select('id').single()
  return { id: (data as any)?.id ?? null, error: error?.message ?? null }
}

export async function updateRegistryRow(
  rowId: string, updates: Partial<WorkerRegistryRow>
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('workers_registry').update(updates).eq('id', rowId)
  return { error: error?.message ?? null }
}

// ── Orders ──────────────────────────────────────────────────────

export async function fetchOrdersByPlatform(
  platformSlug: string, statusFilter?: string
): Promise<OrderRow[]> {
  const supabase = createClient()
  let query = (supabase as any)
    .from('orders')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('order_date', { ascending: false })
  if (statusFilter) query = query.eq('status', statusFilter)
  const { data, error } = await query
  if (error) { console.error('fetchOrdersByPlatform:', error.message); return [] }
  return (data ?? []) as OrderRow[]
}

export async function createOrder(
  order: Omit<OrderRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ order: OrderRow | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders').insert(order as any).select().single()
  return { order: (data as any) ?? null, error: error?.message ?? null }
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Pick<OrderRow, 'status' | 'proxy' | 'owner_name' | 'order_date' | 'notes'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await (supabase as any).from('orders').update(updates).eq('id', orderId)
  return { error: error?.message ?? null }
}

export async function deleteOrder(orderId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  return { error: error?.message ?? null }
}

// ── Payroll ─────────────────────────────────────────────────────

export async function fetchPayrollByPlatform(
  platformSlug: string, year?: number, month?: string
): Promise<PayrollRow[]> {
  const supabase = createClient()
  let query = (supabase as any)
    .from('payroll')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('year', { ascending: false })
  if (year)  query = query.eq('year', year)
  if (month) query = query.eq('month', month)
  const { data, error } = await query
  if (error) { console.error('fetchPayrollByPlatform:', error.message); return [] }
  return (data ?? []) as PayrollRow[]
}

export async function upsertPayrollRow(
  row: Omit<PayrollRow, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('payroll').upsert(row, {
    onConflict: 'platform_id,account_code,worker_name,month,year',
  })
  return { error: error?.message ?? null }
}

// ── Admin — user management ─────────────────────────────────────

export async function fetchAllUsers(): Promise<AppUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('app_users').select('*').order('created_at')
  if (error) { console.error('fetchAllUsers:', error.message); return [] }
  return (data ?? []) as AppUser[]
}
