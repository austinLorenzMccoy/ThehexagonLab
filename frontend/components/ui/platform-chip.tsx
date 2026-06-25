import { cn } from '@/lib/utils'

export interface PlatformChipProps {
  platform: 'platform_a' | 'platform_b' | 'platform_c'
  variant?: 'default' | 'compact'
}

const platformConfig: Record<
  string,
  { label: string; className: string }
> = {
  platform_a: {
    label: 'Platform A',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20',
  },
  platform_b: {
    label: 'Platform B',
    className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20',
  },
  platform_c: {
    label: 'Platform C',
    className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20',
  },
}

export function PlatformChip({ platform, variant = 'default' }: PlatformChipProps) {
  const config = platformConfig[platform]

  if (variant === 'compact') {
    return (
      <span className={cn('inline-block rounded px-1.5 py-0.5 text-xs font-medium', config.className)}>
        {config.label.split(' ')[1]}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
