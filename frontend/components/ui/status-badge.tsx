import { cn } from '@/lib/utils'

export interface StatusBadgeProps {
  status:
    | 'online'
    | 'offline'
    | 'idle'
    | 'busy'
    | 'active'
    | 'inactive'
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'approved'
    | 'paid'
  variant?: 'default' | 'compact'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  online: {
    label: 'Online',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  },
  offline: {
    label: 'Offline',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
  },
  idle: {
    label: 'Idle',
    className: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20',
  },
  busy: {
    label: 'Busy',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  },
  active: {
    label: 'Active',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20',
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20',
  },
}

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status]

  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex h-2 w-2 rounded-full', config.className)}>
        <span className="sr-only">{config.label}</span>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
      {config.label}
    </span>
  )
}
