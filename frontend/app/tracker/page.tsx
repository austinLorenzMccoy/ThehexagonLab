'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  fetchPlatforms,
  fetchTrackerByPlatform,
  fetchPlatformTaskColumns,
  updateTrackerField,
  updateTaskStatus,
} from '@/lib/db'
import type { Platform, WorkerTrackerRow, PlatformTaskColumn, WarningLevel, YNStatus } from '@/types'
import { Download, Upload, Loader2 } from 'lucide-react'
import { ImportDialog, IMPORT_CONFIGS } from '@/components/import/import-dialog'

const WARNING_OPTIONS: WarningLevel[] = ['🟢 Clear', '🟡 Minor', '🔴 Serious', '⚫ Banned', '➖ None']
const STATUS_OPTIONS: YNStatus[] = ['✅ Yes', '❌ No', '⏳ Pending', '🔄 In Progress', '➖ N/A']

export default function TrackerPage() {
  const { hasAccess, isLoading: authLoading } = useAuth()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [workers, setWorkers] = useState<WorkerTrackerRow[]>([])
  const [taskColumns, setTaskColumns] = useState<PlatformTaskColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    fetchPlatforms().then((data) => {
      setPlatforms(data)
      if (data.length > 0) setSelectedPlatform(data[0].slug)
      setLoading(false)
    })
  }, [])

  const loadTrackerData = useCallback(async (slug: string) => {
    setTableLoading(true)
    const [rows, cols] = await Promise.all([
      fetchTrackerByPlatform(slug),
      fetchPlatformTaskColumns(slug),
    ])
    setWorkers(rows)
    setTaskColumns(cols)
    setTableLoading(false)
  }, [])

  useEffect(() => {
    if (selectedPlatform) loadTrackerData(selectedPlatform)
  }, [selectedPlatform, loadTrackerData])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }
  if (!hasAccess('tracker')) {
    return <AccessDenied />
  }

  const handleFieldUpdate = async (rowId: string, field: string, value: string) => {
    const { error } = await updateTrackerField(rowId, field, value)
    if (!error) {
      setWorkers((prev) =>
        prev.map((w) => (w.id === rowId ? { ...w, [field]: value } : w))
      )
    }
  }

  const handleTaskStatusUpdate = async (rowId: string, columnKey: string, value: string) => {
    const { error } = await updateTaskStatus(rowId, columnKey, value)
    if (!error) {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === rowId
            ? { ...w, task_statuses: { ...w.task_statuses, [columnKey]: value as YNStatus } }
            : w
        )
      )
    }
  }

  const handleExport = () => {
    window.open(`/api/export/worker_tracker?platform=${selectedPlatform}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activePlatform = platforms.find((p) => p.slug === selectedPlatform)

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Signal Grid</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Worker task status tracking across platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg border border-ops/20 bg-ops/5 px-4 py-2 text-sm font-medium text-ops hover:bg-ops/10 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border-subtle bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelectedPlatform(p.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedPlatform === p.slug
                ? 'text-white'
                : 'border border-border-subtle text-muted-foreground hover:bg-muted'
            }`}
            style={
              selectedPlatform === p.slug
                ? { backgroundColor: p.color_hex }
                : undefined
            }
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Data table */}
      {tableLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
          <p className="text-muted-foreground">
            No workers tracked for {activePlatform?.label ?? 'this platform'} yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-card">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Worker</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Owner</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Linker</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Warning</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Payoneer</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">SOW</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">LE Cert</th>
                {taskColumns.map((col) => (
                  <th key={col.column_key} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap text-xs">
                    {col.column_label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {workers.map((worker) => (
                <tr key={worker.id} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-2">
                    <div>
                      <Link href={`/worker/${worker.id}`} className="font-medium text-ops hover:underline text-xs">{worker.worker_name}</Link>
                      {worker.email && (
                        <p className="text-[10px] text-muted-foreground">{worker.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">{worker.owner_name}</td>
                  <td className="px-3 py-2 text-xs text-foreground">{worker.linker}</td>
                  <td className="px-3 py-2">
                    <select
                      value={worker.warning_level}
                      onChange={(e) => handleFieldUpdate(worker.id, 'warning_level', e.target.value)}
                      className="rounded bg-transparent border border-border-subtle px-1 py-0.5 text-xs w-24"
                    >
                      {WARNING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={worker.payoneer_linked}
                      onChange={(e) => handleFieldUpdate(worker.id, 'payoneer_linked', e.target.value)}
                      className="rounded bg-transparent border border-border-subtle px-1 py-0.5 text-xs w-24"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={worker.sow_done}
                      onChange={(e) => handleFieldUpdate(worker.id, 'sow_done', e.target.value)}
                      className="rounded bg-transparent border border-border-subtle px-1 py-0.5 text-xs w-24"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={worker.le_cert}
                      onChange={(e) => handleFieldUpdate(worker.id, 'le_cert', e.target.value)}
                      className="rounded bg-transparent border border-border-subtle px-1 py-0.5 text-xs w-24"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>
                  {taskColumns.map((col) => (
                    <td key={col.column_key} className="px-3 py-2">
                      <select
                        value={worker.task_statuses?.[col.column_key] ?? '⏳ Pending'}
                        onChange={(e) => handleTaskStatusUpdate(worker.id, col.column_key, e.target.value)}
                        className="rounded bg-transparent border border-border-subtle px-1 py-0.5 text-xs w-24"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

      {showImport && activePlatform && (
        <ImportDialog
          config={{ ...IMPORT_CONFIGS.worker_tracker, platformId: activePlatform.id }}
          onComplete={() => { setShowImport(false); loadTrackerData(selectedPlatform) }}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  )
}
