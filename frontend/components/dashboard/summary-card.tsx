import { cn } from '@/lib/utils'

interface SummaryCardProps {
  label: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  variant?: 'default' | 'accent'
}

export function SummaryCard({
  label,
  value,
  change,
  icon,
  variant = 'default',
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variant === 'accent'
          ? 'border-ops/20 bg-ops/5'
          : 'border-border-subtle bg-card'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          {change !== undefined && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                change > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {change > 0 ? '+' : ''}{change}% from last period
            </p>
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  )
}
