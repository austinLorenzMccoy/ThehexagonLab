'use client'

import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { PlatformStatsRow } from '@/types'

interface DashboardChartsProps {
  stats: PlatformStatsRow[]
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#e2e8f0',
  },
}

export function WorkersByPlatformChart({ stats }: DashboardChartsProps) {
  const data = stats
    .filter((s) => s.total_workers > 0)
    .map((s) => ({
      name: s.platform_label,
      workers: s.total_workers,
      fill: s.color_hex,
    }))

  if (data.length === 0) return <EmptyChart label="No worker data yet" />

  return (
    <ChartCard title="Workers by Platform">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="workers" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function PayrollByPlatformChart({ stats }: DashboardChartsProps) {
  const data = stats
    .filter((s) => Number(s.total_payroll_usd) > 0)
    .map((s) => ({
      name: s.platform_label,
      payroll: Number(s.total_payroll_usd),
      fill: s.color_hex,
    }))

  if (data.length === 0) return <EmptyChart label="No payroll data yet" />

  return (
    <ChartCard title="Payroll by Platform ($)">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(val: number) => [`$${val.toLocaleString()}`, 'Payroll']} />
          <Bar dataKey="payroll" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function WarningBreakdownChart({ stats }: DashboardChartsProps) {
  const clearCount = stats.reduce((s, p) => s + p.total_workers - p.serious_count - p.banned_count, 0)
  const seriousCount = stats.reduce((s, p) => s + p.serious_count, 0)
  const bannedCount = stats.reduce((s, p) => s + p.banned_count, 0)

  const data = [
    { name: '🟢 Clear', value: clearCount, color: '#10B981' },
    { name: '🔴 Serious', value: seriousCount, color: '#EF4444' },
    { name: '⚫ Banned', value: bannedCount, color: '#6B7280' },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return <EmptyChart label="No warning data yet" />

  return (
    <ChartCard title="Warning Breakdown">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function OrderStatusChart({ stats }: DashboardChartsProps) {
  const totalOrders = stats.reduce((s, p) => s + p.total_orders, 0)
  const issueOrders = stats.reduce((s, p) => s + p.issue_orders, 0)
  const completedOrders = stats.reduce((s, p) => s + p.completed_orders, 0)
  const pendingOrders = totalOrders - completedOrders - issueOrders

  const data = [
    { name: '✅ Completed', value: completedOrders, color: '#10B981' },
    { name: '⏳ In Progress', value: Math.max(0, pendingOrders), color: '#6366F1' },
    { name: '🔴 Issues', value: issueOrders, color: '#EF4444' },
  ].filter((d) => d.value > 0)

  if (data.length === 0) return <EmptyChart label="No order data yet" />

  return (
    <ChartCard title="Order Status">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-card p-4">
      <div className="flex items-center justify-center h-[260px]">
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
