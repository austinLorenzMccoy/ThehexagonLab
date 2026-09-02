export type UserRole = 'admin' | 'manager' | 'supervisor' | 'worker' | 'referrer'

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  platform_access: string[] | null
  worker_id: string | null
  can_view_orders: boolean
  is_active: boolean
  /** Worker Recovery System — contract lifecycle. Defaults to 'active';
   *  auto-flips to 'terminated' once 5 active warnings accrue. Optional
   *  so existing AppUser literals (tests) keep compiling. */
  contract_status?: 'active' | 'terminated'
  /** Worker Recovery System — set once a user becomes a referrer. */
  referral_code?: string | null
  /** Worker Recovery System — worker's rate used for timesheet earnings. */
  hourly_rate_usd?: number | null
  /** Worker Recovery System — Paystack transfer recipient code for payouts. */
  paystack_recipient_code?: string | null
  last_sign_in: string | null
  created_at: string
  updated_at: string
}

export interface Platform {
  id: number
  slug: string
  label: string
  icon: string
  color_hex: string
  is_active: boolean
}

export interface PlatformTaskColumn {
  id: number
  platform_id: number
  column_key: string
  column_label: string
  sort_order: number
  is_active: boolean
}

export type YNStatus =
  | '✅ Yes' | '❌ No' | '⏳ Pending' | '🔄 In Progress' | '➖ N/A'

export type WarningLevel =
  | '🟢 Clear' | '🟡 Minor' | '🔴 Serious' | '⚫ Banned' | '➖ None'

export type OrderStatus =
  | '🟢 Active' | '🟡 Pending' | '🔵 Processing'
  | '🔴 Issue'  | '⚫ Cancelled' | '✅ Completed'

export type GeoworkStatus =
  | '✅ Passed' | '❌ Failed' | '⏳ Pending' | '🔄 Retake' | '⭕ Exempted'

export type AccountType =
  | 'Full-Time' | 'Part-Time' | 'Contractor' | 'Intern' | 'Freelance'

export interface WorkerTrackerRow {
  id: string
  platform_id: number
  owner_name: string
  /** The manager this worker's tracker row is assigned to — a real
   *  app_users.id (role = 'manager'), or null if unassigned. */
  manager_id: string | null
  worker_name: string
  email: string | null
  apple_connect_pw: string | null
  platform_id_code: string | null
  payoneer_linked: YNStatus
  warning_level: WarningLevel
  sow_done: YNStatus
  le_cert: YNStatus
  task_statuses: Record<string, YNStatus>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface WorkerRegistryRow {
  id: string
  platform_id: number
  project_task: string
  owner_name: string
  account_type: AccountType
  email: string | null
  passport: string | null
  geowork_test: GeoworkStatus
  date_started: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderRow {
  id: string
  platform_id: number
  order_id_code: string
  proxy: string | null
  owner_name: string
  status: OrderStatus
  order_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PayrollRow {
  id: string
  platform_id: number
  account_code: string
  worker_name: string
  month: string
  year: number
  tasks_done: number
  pay_usd: number
  notes: string | null
  created_at: string
}

export type ApplicationStatus =
  | '⏳ Pending' | '✅ Accepted' | '❌ Rejected' | '🔄 In Review' | '⚫ Withdrawn'

export interface OnboardingRow {
  id: string
  platform_id: number
  applicant_name: string
  email: string | null
  password: string | null
  phone: string | null
  country: string | null
  referral: string | null
  application_status: ApplicationStatus
  date_applied: string
  date_resolved: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TaskStatusHistoryRow {
  id: string
  tracker_row_id: string
  column_key: string
  old_value: string | null
  new_value: string
  changed_by: string
  changed_at: string
}

export interface PlatformStatsRow {
  platform_id: number
  platform_slug: string
  platform_label: string
  icon: string
  color_hex: string
  total_workers: number
  clear_count: number
  minor_count: number
  serious_count: number
  banned_count: number
  total_orders: number
  issue_orders: number
  total_payroll_usd: number
}

export interface UserPermissions {
  canViewAllPlatforms: boolean
  canEditWorkers: boolean
  canViewOrders: boolean
  canEditOrders: boolean
  canViewPayroll: boolean
  canManageRoles: boolean
  canExport: boolean
  assignedPlatforms: string[] | null
  // Worker Recovery System — additive, does not change any flag above.
  isWorker: boolean
  isReferrer: boolean
  /** Admin-only: managers no longer issue warnings or resolve disputes. */
  canManageWarnings: boolean
  canManageDisputes: boolean
  canViewFeedback: boolean
  canManagePayouts: boolean
  canManagePartnerContacts: boolean
  /** Admin + manager: issue pay slips and settle month-end payment. */
  canManagePaySlips: boolean
}

export function getPermissions(user: AppUser): UserPermissions {
  return {
    canViewAllPlatforms: user.role === 'admin',
    canEditWorkers:      ['admin', 'manager', 'supervisor'].includes(user.role),
    canViewOrders:       user.role === 'admin' || user.can_view_orders,
    canEditOrders:       user.role === 'admin',
    canViewPayroll:      ['admin', 'manager'].includes(user.role),
    canManageRoles:      user.role === 'admin',
    canExport:           ['admin', 'manager'].includes(user.role),
    assignedPlatforms:   user.platform_access,
    isWorker:                 user.role === 'worker',
    isReferrer:               user.role === 'referrer',
    canManageWarnings:        user.role === 'admin',
    canManageDisputes:        user.role === 'admin',
    canViewFeedback:          user.role === 'admin',
    canManagePayouts:         user.role === 'admin',
    canManagePartnerContacts: ['admin', 'manager'].includes(user.role),
    canManagePaySlips:        ['admin', 'manager'].includes(user.role),
  }
}

// ── Worker Recovery System types ───────────────────────────────────

export type ContractStatus = 'active' | 'terminated'

export interface WorkerTimesheetRow {
  id: string
  worker_user_id: string
  platform_id: number | null
  work_date: string
  hours_worked: number
  hourly_rate_usd: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type PaySlipMonth =
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
  | 'July' | 'August' | 'September' | 'October' | 'November' | 'December'

export interface PaySlipRow {
  id: string
  worker_user_id: string
  platform_id: number | null
  period_month: PaySlipMonth
  period_year: number
  expected_amount_usd: number
  currency: string
  slip_file_url: string | null
  issued_by: string | null
  issued_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed'

export interface PaymentRow {
  id: string
  worker_user_id: string
  pay_slip_id: string | null
  amount_usd: number
  status: PaymentStatus
  method: string
  paystack_reference: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface WarningEventRow {
  id: string
  worker_user_id: string
  issued_by: string | null
  reason: string
  comment: string | null
  is_revoked: boolean
  revoked_by: string | null
  revoked_at: string | null
  created_at: string
}

export type FeedbackCategory = 'manager' | 'process' | 'platform' | 'other'

export interface WorkerFeedbackRow {
  id: string
  worker_user_id: string
  category: FeedbackCategory
  subject: string
  message: string
  created_at: string
}

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected'

export interface DisputeRow {
  id: string
  worker_user_id: string
  pay_slip_id: string | null
  subject: string
  description: string
  status: DisputeStatus
  resolution_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type ReferralStatus = 'pending' | 'active' | 'paid'

export interface ReferralRow {
  id: string
  referrer_user_id: string
  referred_worker_user_id: string | null
  referred_name: string
  referred_email: string | null
  status: ReferralStatus
  commission_usd: number
  created_at: string
  updated_at: string
}

export type PayoutType = 'referral_commission' | 'worker_early_pay'
export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid'

export interface PayoutRequestRow {
  id: string
  requester_user_id: string
  type: PayoutType
  amount_usd: number
  status: PayoutStatus
  paystack_reference: string | null
  notes: string | null
  requested_at: string
  processed_by: string | null
  processed_at: string | null
}

export type PartnerContactType = 'worker' | 'referrer' | 'partner'

export interface PartnerContactRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  country: string | null
  contact_type: PartnerContactType
  source: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface WorkerEarningsSummaryRow {
  worker_user_id: string
  display_name: string | null
  email: string
  contract_status: ContractStatus
  month_hours: number
  month_earnings_usd: number
  total_paid_usd: number
  pending_usd: number
  active_warnings: number
  latest_expected_amount_usd: number | null
  latest_period_month: PaySlipMonth | null
  latest_period_year: number | null
}

export interface ReferralSummaryRow {
  referrer_user_id: string
  display_name: string | null
  email: string
  referral_code: string | null
  total_referred: number
  paid_count: number
  pending_count: number
  active_count: number
  total_commission_usd: number
  eligible_for_payout: boolean
}

// ── Revenue split percentages — admin-only, see backend/supabase/
// migrations/20260904000000_revenue_split_percentages.sql ──────────

export interface PlatformRevenueSplit {
  platform_id: number
  client_percentage: number | null
  company_percentage: number | null
  referral_percentage: number | null
  worker_percentage: number | null
  updated_at: string
}

export interface WorkerRevenueOverride {
  worker_user_id: string
  client_percentage: number | null
  company_percentage: number | null
  worker_percentage: number | null
  updated_at: string
}

export interface ReferralRevenueOverride {
  referral_id: string
  referral_percentage: number | null
  updated_at: string
}

/** Effective 4-way split after resolving overrides -> platform default -> 0. */
export interface ResolvedRevenueSplit {
  client_percentage: number
  company_percentage: number
  referral_percentage: number
  worker_percentage: number
}
