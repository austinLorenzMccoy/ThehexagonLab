/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * lib/db.ts — Unified database access layer.
 * All Supabase queries are centralised here. UI components never call Supabase directly.
 */
import { createClient } from '@/lib/supabase/client'
import type {
  AppUser, WorkerTrackerRow, WorkerRegistryRow,
  OrderRow, PayrollRow, Platform, PlatformTaskColumn,
  PlatformStatsRow, TaskStatusHistoryRow, OnboardingRow,
  WorkerTimesheetRow, PaySlipRow, PaymentRow, WarningEventRow,
  WorkerFeedbackRow, DisputeRow, ReferralRow, PayoutRequestRow,
  PartnerContactRow, WorkerEarningsSummaryRow, ReferralSummaryRow,
  PlatformRevenueSplit, WorkerRevenueOverride, ReferralRevenueOverride, ResolvedRevenueSplit,
  WorkerTimesheetEarningsRow,
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
  filters?: { warningLevel?: string; managerId?: string; search?: string }
): Promise<WorkerTrackerRow[]> {
  const supabase = createClient()
  let query = (supabase as any)
    .from('worker_tracker')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('created_at')

  if (filters?.warningLevel) query = query.eq('warning_level', filters.warningLevel)
  if (filters?.managerId)    query = query.eq('manager_id', filters.managerId)
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
  rowId: string, field: string, value: string | null
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('worker_tracker').update({ [field]: value || null }).eq('id', rowId)
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

// ── Manager team view ───────────────────────────────────────────
// Scopes tracker rows + activity to the workers a given manager has been
// assigned via worker_tracker.manager_id (see 20260903000000_tracker_manager.sql).
// RLS already limits `manager` role selects to their platform_access, so
// this is a narrower client-side slice of what tracker_select already
// permits — no new policy needed.

export async function fetchMyTeamTracker(managerId: string): Promise<WorkerTrackerRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('worker_tracker')
    .select('*, platforms(slug, label, icon, color_hex)')
    .eq('manager_id', managerId)
    .order('worker_name')
  if (error) { console.error('fetchMyTeamTracker:', error.message); return [] }
  return (data ?? []) as WorkerTrackerRow[]
}

export async function fetchMyTeamActivity(
  managerId: string, limit = 30
): Promise<TaskStatusHistoryRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('task_status_history')
    .select('*, worker_tracker!inner(worker_name, manager_id)')
    .eq('worker_tracker.manager_id', managerId)
    .order('changed_at', { ascending: false })
    .limit(limit)
  if (error) { console.error('fetchMyTeamActivity:', error.message); return [] }
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

export async function deleteRegistryRow(rowId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('workers_registry').delete().eq('id', rowId)
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
  updates: Partial<OrderRow>
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

export async function updatePayrollRow(
  rowId: string, updates: Partial<PayrollRow>
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('payroll').update(updates).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function deletePayrollRow(rowId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('payroll').delete().eq('id', rowId)
  return { error: error?.message ?? null }
}

// ── Admin — user management ─────────────────────────────────────

export async function fetchAllUsers(): Promise<AppUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('app_users').select('*').order('created_at')
  if (error) { console.error('fetchAllUsers:', error.message); return [] }
  return (data ?? []) as AppUser[]
}

// ── Onboarding ──────────────────────────────────────────────────

export async function fetchOnboardingByPlatform(
  platformSlug: string, statusFilter?: string
): Promise<OnboardingRow[]> {
  const supabase = createClient()
  let query = (supabase as any)
    .from('onboarding')
    .select('*, platforms!inner(slug)')
    .eq('platforms.slug', platformSlug)
    .order('date_applied', { ascending: false })
  if (statusFilter) query = query.eq('application_status', statusFilter)
  const { data, error } = await query
  if (error) { console.error('fetchOnboardingByPlatform:', error.message); return [] }
  return (data ?? []) as OnboardingRow[]
}

export async function insertOnboardingRow(
  row: Omit<OnboardingRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('onboarding').insert(row as any).select('id').single()
  return { id: (data as any)?.id ?? null, error: error?.message ?? null }
}

export async function updateOnboardingRow(
  rowId: string,
  updates: Partial<Pick<OnboardingRow, 'application_status' | 'date_resolved' | 'notes' | 'email' | 'password' | 'phone' | 'country' | 'referral'>>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await (supabase as any).from('onboarding').update(updates).eq('id', rowId)
  return { error: error?.message ?? null }
}

export async function deleteOnboardingRow(rowId: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('onboarding').delete().eq('id', rowId)
  return { error: error?.message ?? null }
}

// ── Audit log ────────────────────────────────────────────────────
// Shared by the Worker Recovery mutations below (warnings, disputes,
// pay slips, payouts) so every state change is traceable to who did
// it and when, matching the pattern already used in
// app/api/admin/users/route.ts. Insert-only (RLS: "Any authed user
// can insert audit"), so this can run from the browser client.

async function logAudit(params: {
  userId: string | null | undefined
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown>
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('audit_log').insert({
    user_id: params.userId ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    details: params.details ?? {},
  } as any)
  if (error) console.error('logAudit:', error.message)
}

// ── Worker Recovery System ───────────────────────────────────────
// Self-service worker portal, timesheets, pay slips, payments,
// warnings, feedback, disputes, referrals, payouts, partner contacts.
// See doc/Worker_Recovery_System_PRD.md.

// -- Earnings summary (worker portal header) ------------------------

export async function fetchWorkerEarningsSummary(
  workerUserId: string
): Promise<WorkerEarningsSummaryRow | null> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('worker_earnings_summary').select('*').eq('worker_user_id', workerUserId).maybeSingle()
  if (error) { console.error('fetchWorkerEarningsSummary:', error.message); return null }
  return (data as WorkerEarningsSummaryRow) ?? null
}

/** Admin/manager overview — every worker's earnings + warning summary. */
export async function fetchAllWorkerEarningsSummaries(): Promise<WorkerEarningsSummaryRow[]> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('worker_earnings_summary').select('*').order('active_warnings', { ascending: false })
  if (error) { console.error('fetchAllWorkerEarningsSummaries:', error.message); return [] }
  return (data ?? []) as WorkerEarningsSummaryRow[]
}

// -- Timesheets -------------------------------------------------------

export async function fetchTimesheets(workerUserId: string): Promise<WorkerTimesheetRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_timesheets').select('*').eq('worker_user_id', workerUserId)
    .order('work_date', { ascending: false })
  if (error) { console.error('fetchTimesheets:', error.message); return [] }
  return (data ?? []) as WorkerTimesheetRow[]
}

export async function logTimesheetHours(
  entry: Omit<WorkerTimesheetRow, 'id' | 'created_at' | 'updated_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_timesheets').insert(entry as any).select('id').single()
  return { id: (data as any)?.id ?? null, error: error?.message ?? null }
}

export async function deleteTimesheetEntry(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('worker_timesheets').delete().eq('id', id)
  return { error: error?.message ?? null }
}

/**
 * The calling worker's own timesheet entries with earnings already
 * split-adjusted (hours x rate x their worker %, resolved server-side
 * — see my_timesheet_earnings() in the PART 14 migration). Replaces
 * the old client-side `hours_worked * hourly_rate_usd` math, which
 * always showed the full nominal rate regardless of any configured
 * split. Never exposes the percentage itself, only the dollar result.
 */
export async function fetchMyTimesheetEarnings(): Promise<WorkerTimesheetEarningsRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('my_timesheet_earnings')
  if (error) { console.error('fetchMyTimesheetEarnings:', error.message); return [] }
  return (data ?? []) as WorkerTimesheetEarningsRow[]
}

/**
 * The calling worker's own effective hourly rate, after their split
 * (falls back to their full nominal rate if no split is configured).
 * Used for "Log at $X/hr" instead of the raw hourly_rate_usd, so the
 * worker is never shown a rate that isn't actually their take-home.
 */
export async function fetchMyEffectiveHourlyRate(): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('my_effective_hourly_rate')
  if (error) { console.error('fetchMyEffectiveHourlyRate:', error.message); return 0 }
  return (data as number) ?? 0
}

/**
 * Self-service: a worker/referrer sets their own preferred Paystack
 * payout currency (NGN or USD) — the app converts their USD-nominal
 * pay slip/payout amount to this currency at settlement time. See
 * set_my_payout_currency() in the PART 15 migration and
 * doc/paystack_integration_guide.md gap #2.
 */
export async function setMyPayoutCurrency(currency: 'NGN' | 'USD'): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.rpc('set_my_payout_currency', { new_currency: currency })
  return { error: error?.message ?? null }
}

// -- Pay slips & payments ---------------------------------------------

export async function fetchPaySlips(workerUserId: string): Promise<PaySlipRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pay_slips').select('*').eq('worker_user_id', workerUserId)
    .order('period_year', { ascending: false })
  if (error) { console.error('fetchPaySlips:', error.message); return [] }
  return (data ?? []) as PaySlipRow[]
}

export async function issuePaySlip(
  slip: Omit<PaySlipRow, 'id' | 'created_at' | 'updated_at' | 'issued_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pay_slips').insert(slip as any).select('id').single()
  const id = (data as any)?.id ?? null
  if (!error && id) {
    await logAudit({
      userId: slip.issued_by,
      action: 'pay_slip_issued',
      entityType: 'pay_slips',
      entityId: id,
      details: {
        worker_user_id: slip.worker_user_id,
        period_month: slip.period_month,
        period_year: slip.period_year,
        expected_amount_usd: slip.expected_amount_usd,
        has_file: !!slip.slip_file_url,
      },
    })
  }
  return { id, error: error?.message ?? null }
}

/** Edit an unpaid pay slip (period, amount, currency, notes). The UI
 *  only offers this while no payment is recorded against the slip —
 *  editing after settlement would desync the figure from the payment
 *  actually sent, so callers should gate on that themselves. */
export async function updatePaySlip(
  id: string,
  updates: Partial<Pick<PaySlipRow, 'period_month' | 'period_year' | 'expected_amount_usd' | 'currency' | 'notes'>>,
  updatedBy?: string
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('pay_slips').update(updates).eq('id', id)
  if (!error && updatedBy) {
    await logAudit({
      userId: updatedBy, action: 'pay_slip_updated', entityType: 'pay_slips',
      entityId: id, details: updates,
    })
  }
  return { error: error?.message ?? null }
}

/** Delete an unpaid pay slip. `payments.pay_slip_id` is `on delete set
 *  null`, so this never destroys a payment record — but deleting a
 *  slip that already has a payment against it would desync the
 *  worker's "already paid" period tracking, so the UI only offers
 *  this while unpaid too. */
export async function deletePaySlip(id: string, deletedBy?: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('pay_slips').delete().eq('id', id)
  if (!error && deletedBy) {
    await logAudit({ userId: deletedBy, action: 'pay_slip_deleted', entityType: 'pay_slips', entityId: id })
  }
  return { error: error?.message ?? null }
}

/** Admin oversight — every pay slip issued, across all workers. */
export async function fetchAllPaySlips(): Promise<PaySlipRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pay_slips').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchAllPaySlips:', error.message); return [] }
  return (data ?? []) as PaySlipRow[]
}

/**
 * Uploads a pay slip document (PDF/image) to the private `pay-slips`
 * storage bucket under `${workerUserId}/...` so RLS can scope worker
 * read-access to their own folder. Returns the storage path (not a
 * public URL — the bucket is private) to store in `slip_file_url`.
 */
export async function uploadPaySlipFile(
  workerUserId: string, file: File
): Promise<{ path: string | null; error: string | null }> {
  const supabase = createClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
  const path = `${workerUserId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from('pay-slips').upload(path, file, { upsert: false })
  return { path: error ? null : path, error: error?.message ?? null }
}

/** Short-lived signed URL to view/download a pay slip file (bucket is private). */
export async function getPaySlipFileUrl(path: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from('pay-slips').createSignedUrl(path, 300)
  if (error) { console.error('getPaySlipFileUrl:', error.message); return null }
  return data?.signedUrl ?? null
}

export async function fetchPayments(workerUserId: string): Promise<PaymentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments').select('*').eq('worker_user_id', workerUserId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchPayments:', error.message); return [] }
  return (data ?? []) as PaymentRow[]
}

/** Admin oversight — every payment across all workers (used to show
 *  paid/unpaid status per pay slip on the Pay Slips page). */
export async function fetchAllPayments(): Promise<PaymentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchAllPayments:', error.message); return [] }
  return (data ?? []) as PaymentRow[]
}

/**
 * Manual fallback for month-end salary settlement — records a
 * `payments` row directly (no Paystack call). Used by the Pay Slips
 * page when POST /api/payments/process degrades (Paystack not
 * configured / no recipient code on file), so an admin settling
 * off-platform can still mark a slip paid. See PRD §4.3 step 2.
 */
export async function recordPaySlipPayment(
  entry: Pick<PaymentRow, 'worker_user_id' | 'pay_slip_id' | 'amount_usd' | 'status'>,
  processedBy?: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payments')
    .insert({
      worker_user_id: entry.worker_user_id,
      pay_slip_id: entry.pay_slip_id,
      amount_usd: entry.amount_usd,
      status: entry.status,
      method: 'manual',
      paid_at: entry.status === 'paid' ? new Date().toISOString() : null,
    } as any)
    .select('id').single()
  const id = (data as any)?.id ?? null
  if (!error && id) {
    await logAudit({
      userId: processedBy, action: 'payment_recorded', entityType: 'payments', entityId: id,
      details: { worker_user_id: entry.worker_user_id, pay_slip_id: entry.pay_slip_id, amount_usd: entry.amount_usd, status: entry.status },
    })
  }
  if (error?.code === '23505') {
    return { id: null, error: 'This pay slip has already been paid.' }
  }
  return { id, error: error?.message ?? null }
}

/**
 * Reverses a mistaken "Mark Paid" — deletes the slip's active payment
 * row (status 'paid' or 'processing'; `idx_payments_one_active_per_slip`
 * guarantees at most one). This does NOT touch Paystack — it only
 * clears the local record, so only use it for a manually-recorded
 * payment or a transfer that never actually happened. Once reversed,
 * the pay slip itself becomes editable/deletable again.
 */
export async function unmarkPaySlipPaid(
  paySlipId: string, actorId?: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('payments').delete().eq('pay_slip_id', paySlipId).in('status', ['paid', 'processing'])
  if (!error && actorId) {
    await logAudit({
      userId: actorId, action: 'pay_slip_payment_reversed', entityType: 'pay_slips', entityId: paySlipId,
    })
  }
  return { error: error?.message ?? null }
}

// -- Warnings (progressive escalation, 5 = auto-termination) ---------

export async function fetchWarnings(workerUserId: string): Promise<WarningEventRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('warning_events').select('*').eq('worker_user_id', workerUserId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchWarnings:', error.message); return [] }
  return (data ?? []) as WarningEventRow[]
}

export async function issueWarning(
  workerUserId: string, reason: string, comment: string | undefined, issuedBy: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('warning_events')
    .insert({ worker_user_id: workerUserId, reason, comment: comment ?? null, issued_by: issuedBy } as any)
    .select('id').single()
  const id = (data as any)?.id ?? null
  if (!error && id) {
    await logAudit({
      userId: issuedBy, action: 'warning_issued', entityType: 'warning_events', entityId: id,
      details: { worker_user_id: workerUserId, reason },
    })
  }
  return { id, error: error?.message ?? null }
}

export async function revokeWarning(id: string, revokedBy: string): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('warning_events')
    .update({ is_revoked: true, revoked_at: new Date().toISOString(), revoked_by: revokedBy })
    .eq('id', id)
  if (!error) {
    await logAudit({ userId: revokedBy, action: 'warning_revoked', entityType: 'warning_events', entityId: id })
  }
  return { error: error?.message ?? null }
}

// -- Feedback (admin-only visibility, workers see their own) ---------

export async function fetchMyFeedback(workerUserId: string): Promise<WorkerFeedbackRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_feedback').select('*').eq('worker_user_id', workerUserId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchMyFeedback:', error.message); return [] }
  return (data ?? []) as WorkerFeedbackRow[]
}

/** Admin inbox — every worker's feedback. Managers must never call this. */
export async function fetchAllFeedback(): Promise<WorkerFeedbackRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_feedback').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchAllFeedback:', error.message); return [] }
  return (data ?? []) as WorkerFeedbackRow[]
}

export async function submitFeedback(
  entry: Omit<WorkerFeedbackRow, 'id' | 'created_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('worker_feedback').insert(entry as any)
  return { error: error?.message ?? null }
}

// -- Disputes -----------------------------------------------------------

export async function fetchMyDisputes(workerUserId: string): Promise<DisputeRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('disputes').select('*').eq('worker_user_id', workerUserId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchMyDisputes:', error.message); return [] }
  return (data ?? []) as DisputeRow[]
}

/** Admin dispute queue — every open/in-review dispute. */
export async function fetchAllDisputes(): Promise<DisputeRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('disputes').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchAllDisputes:', error.message); return [] }
  return (data ?? []) as DisputeRow[]
}

export async function raiseDispute(
  entry: Omit<DisputeRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'resolution_notes' | 'resolved_by' | 'resolved_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.from('disputes').insert(entry as any).select('id').single()
  const id = (data as any)?.id ?? null
  if (!error && id) {
    await logAudit({
      userId: entry.worker_user_id, action: 'dispute_raised', entityType: 'disputes', entityId: id,
      details: { subject: entry.subject },
    })
  }
  return { error: error?.message ?? null }
}

export async function resolveDispute(
  id: string, status: DisputeRow['status'], resolutionNotes: string | undefined, resolvedBy: string
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('disputes')
    .update({
      status,
      resolution_notes: resolutionNotes ?? null,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (!error) {
    await logAudit({ userId: resolvedBy, action: 'dispute_resolved', entityType: 'disputes', entityId: id, details: { status } })
  }
  return { error: error?.message ?? null }
}

// -- Referrals & payout gating -----------------------------------------

export async function fetchReferralSummary(referrerUserId: string): Promise<ReferralSummaryRow | null> {
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('referral_summary').select('*').eq('referrer_user_id', referrerUserId).maybeSingle()
  if (error) { console.error('fetchReferralSummary:', error.message); return null }
  return (data as ReferralSummaryRow) ?? null
}

export async function fetchReferrals(referrerUserId: string): Promise<ReferralRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('referrals').select('*').eq('referrer_user_id', referrerUserId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchReferrals:', error.message); return [] }
  return (data ?? []) as ReferralRow[]
}

/** Admin oversight — every referral across every referrer. */
export async function fetchAllReferrals(): Promise<ReferralRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('referrals').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchAllReferrals:', error.message); return [] }
  return (data ?? []) as ReferralRow[]
}

export async function addReferral(
  entry: Omit<ReferralRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'commission_usd'> & { commission_usd?: number }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('referrals').insert(entry as any)
  return { error: error?.message ?? null }
}

export async function updateReferralStatus(
  id: string, status: ReferralRow['status']
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('referrals').update({ status }).eq('id', id)
  return { error: error?.message ?? null }
}

export async function updateReferral(
  id: string,
  updates: Partial<Pick<ReferralRow, 'referrer_user_id' | 'referred_name' | 'referred_email'>>
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('referrals').update(updates).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deleteReferral(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('referrals').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// -- Payout requests (referral commission or worker early pay) --------

export async function fetchMyPayoutRequests(requesterUserId: string): Promise<PayoutRequestRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payout_requests').select('*').eq('requester_user_id', requesterUserId)
    .order('requested_at', { ascending: false })
  if (error) { console.error('fetchMyPayoutRequests:', error.message); return [] }
  return (data ?? []) as PayoutRequestRow[]
}

/** Admin queue — every pending/approved payout request. */
export async function fetchAllPayoutRequests(): Promise<PayoutRequestRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('payout_requests').select('*').order('requested_at', { ascending: false })
  if (error) { console.error('fetchAllPayoutRequests:', error.message); return [] }
  return (data ?? []) as PayoutRequestRow[]
}

/**
 * Requests a payout. The `referral_commission` gating rule (every
 * referred worker must already be paid) is enforced server-side by the
 * `trg_payout_gating` trigger — this call surfaces that as a normal
 * `{ error }` result rather than a thrown exception.
 */
export async function requestPayout(
  entry: Pick<PayoutRequestRow, 'requester_user_id' | 'type' | 'amount_usd'> & { notes?: string | null }
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('payout_requests').insert(entry as any)
  return { error: error?.message ?? null }
}

export async function updatePayoutRequest(
  id: string,
  updates: Partial<Pick<PayoutRequestRow, 'status' | 'paystack_reference' | 'notes'>>,
  processedBy?: string
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase
    .from('payout_requests')
    .update({ ...updates, processed_by: processedBy ?? null, processed_at: new Date().toISOString() })
    .eq('id', id)
  if (!error && processedBy) {
    await logAudit({
      userId: processedBy, action: `payout_${updates.status ?? 'updated'}`, entityType: 'payout_requests',
      entityId: id, details: updates,
    })
  }
  return { error: error?.message ?? null }
}

// -- Partner / contact records (Excel/CSV import target) --------------

export async function fetchPartnerContacts(): Promise<PartnerContactRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('partner_contacts').select('*').order('created_at', { ascending: false })
  if (error) { console.error('fetchPartnerContacts:', error.message); return [] }
  return (data ?? []) as PartnerContactRow[]
}

export async function insertPartnerContact(
  entry: Omit<PartnerContactRow, 'id' | 'created_at'>
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('partner_contacts').insert(entry as any).select('id').single()
  return { id: (data as any)?.id ?? null, error: error?.message ?? null }
}

export async function updatePartnerContact(
  id: string, updates: Partial<Omit<PartnerContactRow, 'id' | 'created_at' | 'created_by'>>
): Promise<{ error: string | null }> {
  const supabase = createClient() as any
  const { error } = await supabase.from('partner_contacts').update(updates).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deletePartnerContact(id: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('partner_contacts').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// -- Revenue split percentages (admin-only — see migration for why) ---
//
// Client / company / referral / worker percentages, confidential per
// party and gated by RLS to role='admin'. Workers and referrers never
// query these tables; they only ever see the resulting dollar amounts
// (pay slips, payments, referral commission_usd) as before.

export async function fetchPlatformRevenueSplits(): Promise<PlatformRevenueSplit[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('platform_revenue_splits').select('*')
  if (error) { console.error('fetchPlatformRevenueSplits:', error.message); return [] }
  return (data ?? []) as PlatformRevenueSplit[]
}

export async function upsertPlatformRevenueSplit(
  entry: Omit<PlatformRevenueSplit, 'updated_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('platform_revenue_splits').upsert(entry as any, { onConflict: 'platform_id' })
  return { error: error?.message ?? null }
}

export async function fetchWorkerRevenueOverride(workerUserId: string): Promise<WorkerRevenueOverride | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('worker_revenue_overrides').select('*').eq('worker_user_id', workerUserId).maybeSingle()
  if (error) { console.error('fetchWorkerRevenueOverride:', error.message); return null }
  return (data as any as WorkerRevenueOverride) ?? null
}

export async function fetchAllWorkerRevenueOverrides(): Promise<WorkerRevenueOverride[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('worker_revenue_overrides').select('*')
  if (error) { console.error('fetchAllWorkerRevenueOverrides:', error.message); return [] }
  return (data ?? []) as WorkerRevenueOverride[]
}

export async function upsertWorkerRevenueOverride(
  entry: Omit<WorkerRevenueOverride, 'updated_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('worker_revenue_overrides').upsert(entry as any, { onConflict: 'worker_user_id' })
  return { error: error?.message ?? null }
}

export async function fetchAllReferralRevenueOverrides(): Promise<ReferralRevenueOverride[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('referral_revenue_overrides').select('*')
  if (error) { console.error('fetchAllReferralRevenueOverrides:', error.message); return [] }
  return (data ?? []) as ReferralRevenueOverride[]
}

export async function upsertReferralRevenueOverride(
  entry: Omit<ReferralRevenueOverride, 'updated_at'>
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('referral_revenue_overrides').upsert(entry as any, { onConflict: 'referral_id' })
  return { error: error?.message ?? null }
}

/**
 * Resolves the effective 4-way split for a worker: worker-level
 * override wins, falling back to the platform's default; referral %
 * additionally checks a per-referral override. Non-admin callers get
 * all zeros back (RLS silently returns no rows), which is the correct
 * "silo" behavior — only admin can ever see real percentages.
 */
export async function resolveRevenueSplit(
  workerUserId: string, platformId: number | null, referralId?: string | null
): Promise<ResolvedRevenueSplit> {
  const supabase = createClient()
  const [platformRes, workerRes, referralRes] = await Promise.all([
    platformId
      ? supabase.from('platform_revenue_splits').select('*').eq('platform_id', platformId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('worker_revenue_overrides').select('*').eq('worker_user_id', workerUserId).maybeSingle(),
    referralId
      ? supabase.from('referral_revenue_overrides').select('*').eq('referral_id', referralId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const platformSplit = platformRes.data as any
  const workerOverride = workerRes.data as any
  const referralOverride = referralRes.data as any

  const client = workerOverride?.client_percentage ?? platformSplit?.client_percentage ?? 0
  const company = workerOverride?.company_percentage ?? platformSplit?.company_percentage ?? 0
  const referral = referralOverride?.referral_percentage ?? platformSplit?.referral_percentage ?? 0
  const worker = workerOverride?.worker_percentage ?? platformSplit?.worker_percentage
    ?? Math.max(0, 100 - client - company - referral)

  return { client_percentage: client, company_percentage: company, referral_percentage: referral, worker_percentage: worker }
}
