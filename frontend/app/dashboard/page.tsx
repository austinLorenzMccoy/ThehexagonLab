'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { fetchPlatformStats } from '@/lib/db'
import {
  WorkersByPlatformChart,
  PayrollByPlatformChart,
  WarningBreakdownChart,
  OrderStatusChart,
} from '@/components/dashboard/charts'
import type { PlatformStatsRow } from '@/types'
import { Users, ShoppingCart, AlertTriangle, DollarSign, Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { hasAccess, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<PlatformStatsRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlatformStats().then((data) => {
      setStats(data)
      setLoading(false)
    })
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }

  if (!hasAccess('dashboard')) {
    return <AccessDenied />
  }

  const totals = stats.reduce(
    (acc, p) => ({
      workers: acc.workers + p.total_workers,
      orders: acc.orders + p.total_orders,
      issues: acc.issues + p.issue_orders,
      warnings: acc.warnings + p.serious_count + p.banned_count,
      payroll: acc.payroll + Number(p.total_payroll_usd),
    }),
    { workers: 0, orders: 0, issues: 0, warnings: 0, payroll: 0 }
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time overview of worker operations across all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Workers"
          value={totals.workers}
          icon={<Users className="h-5 w-5" />}
        />
        <SummaryCard
          label="Total Orders"
          value={totals.orders}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
        <SummaryCard
          label="Active Warnings"
          value={totals.warnings}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={totals.warnings > 0 ? 'accent' : 'default'}
        />
        <SummaryCard
          label="Total Payroll"
          value={`$${totals.payroll.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorkersByPlatformChart stats={stats} />
        <PayrollByPlatformChart stats={stats} />
        <WarningBreakdownChart stats={stats} />
        <OrderStatusChart stats={stats} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Platform Overview
        </h2>

        {stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
            <p className="text-muted-foreground">No platform data yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Seed worker data to see stats here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((platform) => (
              <div
                key={platform.platform_id}
                className="rounded-lg border border-border-subtle bg-card p-4 hover:border-opacity-80 transition-colors"
                style={{ borderLeftColor: platform.color_hex, borderLeftWidth: '3px' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{platform.icon}</span>
                    <h3 className="font-semibold text-foreground">
                      {platform.platform_label}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Workers</p>
                    <p className="font-bold text-foreground text-sm">
                      {platform.total_workers}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Orders</p>
                    <p className="font-bold text-foreground text-sm">
                      {platform.total_orders}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payroll</p>
                    <p className="font-bold text-foreground text-sm">
                      ${Number(platform.total_payroll_usd).toLocaleString()}
                    </p>
                  </div>
                </div>

                {(platform.serious_count > 0 || platform.banned_count > 0) && (
                  <div className="mt-3 flex gap-2">
                    {platform.serious_count > 0 && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        🔴 {platform.serious_count} serious
                      </span>
                    )}
                    {platform.banned_count > 0 && (
                      <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        ⚫ {platform.banned_count} banned
                      </span>
                    )}
                  </div>
                )}

                {platform.total_workers === 0 && platform.total_orders === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    No data yet
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
