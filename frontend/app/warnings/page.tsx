'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  fetchAllWorkerEarningsSummaries,
  fetchWarnings,
  issueWarning,
  revokeWarning,
  fetchAllDisputes,
  fetchMyDisputes,
  resolveDispute,
} from '@/lib/db'
import type { WorkerEarningsSummaryRow, WarningEventRow, DisputeRow } from '@/types'
import { Loader2, AlertTriangle, Gavel, X } from 'lucide-react'

const DISPUTE_STATUSES: DisputeRow['status'][] = ['open', 'in_review', 'resolved', 'rejected']

export default function WarningsAndDisputesPage() {
  const { hasAccess, appUser } = useAuth()
  const { toast } = useToast()

  const [workers, setWorkers] = useState<WorkerEarningsSummaryRow[]>([])
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeWorker, setActiveWorker] = useState<WorkerEarningsSummaryRow | null>(null)
  const [activeWorkerWarnings, setActiveWorkerWarnings] = useState<WarningEventRow[]>([])
  const [activeWorkerDisputes, setActiveWorkerDisputes] = useState<DisputeRow[]>([])

  const load = useCallback(async () => {
    const [w, d] = await Promise.all([fetchAllWorkerEarningsSummaries(), fetchAllDisputes()])
    setWorkers(w); setDisputes(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (!hasAccess('warnings')) return <AccessDenied />

  const openWorkerPanel = async (w: WorkerEarningsSummaryRow) => {
    setActiveWorker(w)
    const [warnings, workerDisputes] = await Promise.all([
      fetchWarnings(w.worker_user_id),
      fetchMyDisputes(w.worker_user_id),
    ])
    setActiveWorkerWarnings(warnings)
    setActiveWorkerDisputes(workerDisputes)
  }

  const handleIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeWorker) return
    const fd = new FormData(e.currentTarget)
    const { error } = await issueWarning(
      activeWorker.worker_user_id,
      fd.get('reason') as string,
      (fd.get('comment') as string) || undefined,
      appUser?.id ?? ''
    )
    if (error) { toast(`Could not issue warning: ${error}`, 'error'); return }
    toast('Warning issued', 'success')
    ;(e.target as HTMLFormElement).reset()
    setActiveWorkerWarnings(await fetchWarnings(activeWorker.worker_user_id))
    load()
  }

  const handleRevoke = async (id: string) => {
    const { error } = await revokeWarning(id, appUser?.id ?? '')
    if (error) { toast(`Could not revoke: ${error}`, 'error'); return }
    toast('Warning revoked', 'success')
    if (activeWorker) setActiveWorkerWarnings(await fetchWarnings(activeWorker.worker_user_id))
    load()
  }

  const handleResolve = async (id: string, status: DisputeRow['status']) => {
    const notes = status === 'resolved' || status === 'rejected'
      ? window.prompt('Resolution notes (optional):') ?? undefined
      : undefined
    const { error } = await resolveDispute(id, status, notes, appUser?.id ?? '')
    if (error) { toast(`Could not update dispute: ${error}`, 'error'); return }
    toast('Dispute updated', 'success')
    if (activeWorker) setActiveWorkerDisputes(await fetchMyDisputes(activeWorker.worker_user_id))
    load()
  }

  const renderDisputeCard = (d: DisputeRow) => (
    <div key={d.id} className="rounded bg-background/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{d.subject}</p>
        <span className="text-xs font-medium capitalize text-muted-foreground">{d.status.replace('_', ' ')}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
      {d.resolution_notes && (
        <p className="text-xs text-foreground mt-1 italic">Resolution: {d.resolution_notes}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DISPUTE_STATUSES.filter((s) => s !== d.status).map((s) => (
          <button
            key={s}
            onClick={() => handleResolve(d.id, s)}
            className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors capitalize"
          >
            Mark {s.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
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
        <h1 className="text-3xl font-bold text-foreground">Warnings & Disputes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issue or revoke worker warnings and review pay-slip disputes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Worker roster with warning counts */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Workers
          </h2>
          {workers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No worker accounts yet</p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {workers.map((w) => {
                const openDisputeCount = disputes.filter(
                  (d) => d.worker_user_id === w.worker_user_id && (d.status === 'open' || d.status === 'in_review')
                ).length
                return (
                  <button
                    key={w.worker_user_id}
                    onClick={() => openWorkerPanel(w)}
                    className="flex w-full items-center justify-between rounded bg-background/50 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">{w.display_name ?? w.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {w.contract_status === 'terminated' ? '⚫ Terminated' : '🟢 Active'}
                        {openDisputeCount > 0 && (
                          <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            {openDisputeCount} open dispute{openDisputeCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i < w.active_warnings
                              ? i < 2 ? 'bg-yellow-400' : i < 4 ? 'bg-orange-500' : 'bg-red-600'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Disputes queue */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Gavel className="h-4 w-4" /> Dispute Queue
          </h2>
          {disputes.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No disputes filed</p>
          ) : (
            <div className="space-y-3 max-h-[28rem] overflow-y-auto">
              {disputes.map(renderDisputeCard)}
            </div>
          )}
        </div>
      </div>

      {/* Issue/revoke warning panel */}
      {activeWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-xl border border-border-subtle bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
                {activeWorker.display_name ?? activeWorker.email}
              </h2>
              <button onClick={() => setActiveWorker(null)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <form onSubmit={handleIssue} className="space-y-2">
                <input name="reason" required placeholder="Reason for warning"
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
                <textarea name="comment" rows={2} placeholder="Comment visible to the worker (optional)"
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
                <button type="submit" className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
                  Issue Warning
                </button>
              </form>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {activeWorkerWarnings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No warnings on file</p>
                ) : activeWorkerWarnings.map((w) => (
                  <div key={w.id} className={`rounded px-3 py-2 text-xs ${w.is_revoked ? 'bg-background/30 opacity-60' : 'bg-background/50'}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">{w.reason}</p>
                      {!w.is_revoked && (
                        <button onClick={() => handleRevoke(w.id)} className="text-[10px] font-medium text-ops hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                    {w.comment && <p className="text-muted-foreground mt-0.5">{w.comment}</p>}
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(w.created_at).toLocaleDateString()} {w.is_revoked && '— revoked'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Per-worker dispute history — PRD §4.7 "Open disputes / Comments history" */}
              <div className="border-t border-border-subtle pt-3">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5" /> Disputes
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {activeWorkerDisputes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No disputes filed</p>
                  ) : activeWorkerDisputes.map(renderDisputeCard)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
