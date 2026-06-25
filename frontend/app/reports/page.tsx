'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { createClient } from '@/lib/supabase/client'
import { fetchPlatforms } from '@/lib/db'
import type { Platform } from '@/types'
import { Download, Loader2, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface ReportData {
  platform_label: string
  platform_icon: string
  total_workers: number
  total_tasks: number
  total_pay: number
  entries: any[]
}

export default function ReportsPage() {
  const { hasAccess } = useAuth()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [reports, setReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()])

  const loadReport = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const plats = await fetchPlatforms()
    setPlatforms(plats)

    const { data, error } = await supabase
      .from('payroll')
      .select('*, platforms(label, icon)')
      .eq('month', month)
      .eq('year', year)
      .order('platform_id')
      .order('pay_usd', { ascending: false })

    if (error) {
      console.error('Report error:', error.message)
      setReports([])
      setLoading(false)
      return
    }

    // Group by platform
    const grouped: Record<number, ReportData> = {}
    for (const row of (data ?? []) as any[]) {
      const pid = row.platform_id
      if (!grouped[pid]) {
        grouped[pid] = {
          platform_label: row.platforms?.label ?? 'Unknown',
          platform_icon: row.platforms?.icon ?? '📊',
          total_workers: 0,
          total_tasks: 0,
          total_pay: 0,
          entries: [],
        }
      }
      grouped[pid].total_workers++
      grouped[pid].total_tasks += row.tasks_done
      grouped[pid].total_pay += Number(row.pay_usd)
      grouped[pid].entries.push(row)
    }

    setReports(Object.values(grouped))
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (!hasAccess('payroll')) {
    return <AccessDenied />
  }

  const grandTotal = reports.reduce(
    (acc, r) => ({
      workers: acc.workers + r.total_workers,
      tasks: acc.tasks + r.total_tasks,
      pay: acc.pay + r.total_pay,
    }),
    { workers: 0, tasks: 0, pay: 0 }
  )

  const handleExport = () => {
    const rows = reports.flatMap((r) =>
      r.entries.map((e: any) => ({
        Platform: r.platform_label,
        'Worker Name': e.worker_name,
        'Account Code': e.account_code,
        'Tasks Done': e.tasks_done,
        'Pay (USD)': Number(e.pay_usd),
        Month: e.month,
        Year: e.year,
        Notes: e.notes ?? '',
      }))
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `${month} ${year}`)
    XLSX.writeFile(wb, `HexagonLABS_Report_${month}_${year}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Monthly Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-generated payroll summaries with export
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={reports.length === 0}
          className="flex items-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      {/* Period selector */}
      <div className="flex gap-3">
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
        >
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
        >
          {Array.from({ length: 6 }, (_, i) => 2025 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Grand totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workers Paid</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{grandTotal.workers}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tasks</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{grandTotal.tasks.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Payout</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            ${grandTotal.pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Platform reports */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-16">
          <FileText className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No payroll data for {month} {year}.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report, i) => (
            <div key={i} className="rounded-lg border border-border-subtle bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{report.platform_icon}</span>
                  <h3 className="font-semibold text-foreground">{report.platform_label}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{report.total_workers} workers</span>
                  <span>{report.total_tasks.toLocaleString()} tasks</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ${report.total_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="border-b border-border-subtle">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Worker</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Account</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Tasks</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Pay (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {report.entries.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-medium text-foreground">{entry.worker_name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{entry.account_code}</td>
                      <td className="px-4 py-2 text-right text-foreground">{entry.tasks_done}</td>
                      <td className="px-4 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                        ${Number(entry.pay_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
