'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  Grid3x3,
  Users,
  ClipboardCheck,
  ShoppingCart,
  DollarSign,
  FileBarChart,
  History,
  ShieldCheck,
  Settings,
  Home,
  AlertTriangle,
  MessageSquare,
  UserPlus,
  Contact,
  Receipt,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const channels = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'my-team',
    label: 'My Team',
    icon: UserCheck,
    href: '/my-team',
  },
  {
    id: 'tracker',
    label: 'Tracker',
    icon: Grid3x3,
    href: '/tracker',
  },
  {
    id: 'registry',
    label: 'Registry',
    icon: Users,
    href: '/registry',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: ClipboardCheck,
    href: '/onboarding',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    href: '/orders',
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: DollarSign,
    href: '/payroll',
  },
  {
    id: 'pay-slips',
    label: 'Pay Slips',
    icon: Receipt,
    href: '/pay-slips',
  },
  {
    id: 'warnings',
    label: 'Warnings & Disputes',
    icon: AlertTriangle,
    href: '/warnings',
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: MessageSquare,
    href: '/feedback',
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: UserPlus,
    href: '/referrals',
  },
  {
    id: 'partners',
    label: 'Partner Contacts',
    icon: Contact,
    href: '/partners',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileBarChart,
    href: '/reports',
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: History,
    href: '/activity',
  },
  {
    id: 'audit',
    label: 'Audit',
    icon: ShieldCheck,
    href: '/audit',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Settings,
    href: '/admin',
  },
]

interface SignalNavProps {
  collapsed?: boolean
}

export function SignalNav({ collapsed = false }: SignalNavProps) {
  const pathname = usePathname()
  const { hasAccess } = useAuth()

  return (
    <nav className="flex flex-col gap-1 px-2 py-4">
      {/* Home button — navigates to the landing page */}
      <Link
        href="/"
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          'text-muted-foreground hover:bg-white/10 hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
        title="Home"
      >
        <Home className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span>Home</span>}
      </Link>

      <div className="my-1.5 mx-3 border-t border-white/[0.06]" />

      {channels.map((channel) => {
        if (!hasAccess(channel.id)) return null

        const Icon = channel.icon
        const isActive = pathname.startsWith(channel.href)

        return (
          <Link
            key={channel.id}
            href={channel.href}
            title={collapsed ? channel.label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-white/10 hover:text-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{channel.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
