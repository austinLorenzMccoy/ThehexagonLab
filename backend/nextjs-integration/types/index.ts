export type UserRole = 'admin' | 'manager' | 'supervisor' | 'worker'

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  role: UserRole
  platform_access: string[] | null
  worker_id: string | null
  can_view_orders: boolean
  is_active: boolean
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

export type LinkerType =
  | 'Linker A' | 'Linker B' | 'Linker C' | 'Linker D' | 'Self'

export interface WorkerTrackerRow {
  id: string
  platform_id: number
  owner_name: string
  linker: LinkerType
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
  }
}
