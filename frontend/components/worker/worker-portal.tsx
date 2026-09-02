'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import {
  fetchWorkerEarningsSummary,
  fetchTimesheets,
  logTimesheetHours,
  fetchPaySlips,
  fetchPayments,
  fetchWarnings,
  fetchMyFeedback,
  submitFeedback,
  fetchMyDisputes,
  raiseDispute,
  getPaySlipFileUrl,
} from '@/lib/db'
import type {
  WorkerEarningsSummaryRow, WorkerTimesheetRow, PaySlipRow, PaymentRow,
  WarningEventRow, WorkerFeedbackRow, DisputeRow, FeedbackCategory,
} from '@/types'
import { Loader2, Clock, DollarSign, AlertTriangle, MessageSquare, Gavel, Plus } from 'lucide-react'

const WARNING_DOTS = 5

/** Worker Recovery System — self-service dashboard for role === 'worker'.
 *  Everything a worker needs day-to-day: earnings, timesheet logging,
 *  pay slip / payment status, warning standing, feedback, disputes.
 *  See doc/Worker_Recovery_System_PRD.md §4.1-4.6. */
export function WorkerPortal() {
  const { appUser } = useAuth()
  const { toast } = useToast()
  const workerId = appUser!.id

  const [summary, setSummary] = useState<WorkerEarningsSummaryRow | null>(null)
  const [timesheets, setTimesheets] = useState<WorkerTimesheetRow[]>([])
  const [paySlips, setPaySlips] = useState<PaySlipRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [warnings, setWarnings] = useState<WarningEventRow[]>([])
  const [feedback, setFeedback] = useState<WorkerFeedbackRow[]>([])
  const [disputes, setDisputes] = useState<DisputeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)

  const load = useCallback(async () => {
    const [s, ts, ps, pay, w, fb, d] = await Promise.all([
      fetchWorkerEarningsSummary(workerId),
      fetchTimesheets(workerId),
      fetchPaySlips(workerId),
      fetchPayments(workerId),
      fetchWarnings(workerId),
      fetchMyFeedback(workerId),
      fetchMyDisputes(workerId),
    ])
    setSummary(s); setTimesheets(ts); setPaySlips(ps); setPayments(pay)
    setWarnings(w); setFeedback(fb); setDisputes(d)
    setLoading(false)
  }, [workerId])

  useEffect(() => { load() }, [load])

  const activeWarnings = warnings.filter((w) => !w.is_revoked)
  const contractStatus = summary?.contract_status ?? appUser?.contract_status ?? 'active'
  const rate = appUser?.hourly_rate_usd ?? 0

  const handleLogHours = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLogging(true)
    const fd = new FormData(e.currentTarget)
    const hours = Number(fd.get('hours_worked'))
    const { error } = await logTimesheetHours({
      worker_user_id: workerId,
      platform_id: null,
      work_date: (fd.get('work_date') as string) || new Date().toISOString().split('T')[0],
      hours_worked: hours,
      hourly_rate_usd: rate,
      notes: (fd.get('notes') as string) || null,
    })
    setLogging(false)
    if (error) { toast(`Could not log hours: ${error}`, 'error'); return }
    toast(`Logged ${hours}h — $${(hours * rate).toFixed(2)} for the day`, 'success')
    ;(e.target as HTMLFormElement).reset()
    load()
  }

  const handleFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { error } = await submitFeedback({
      worker_user_id: workerId,
      category: fd.get('category') as FeedbackCategory,
      subject: fd.get('subject') as string,
      message: fd.get('message') as string,
    })
    if (error) { toast(`Could not submit feedback: ${error}`, 'error'); return }
    toast('Feedback submitted — only Admins can view this', 'success')
    ;(e.target as HTMLFormElement).reset()
    load()
  }

  const handleDownloadSlip = async (path: string) => {
    const url = await getPaySlipFileUrl(path)
    if (!url) { toast('Could not generate a download link', 'error'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDispute = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { error } = await raiseDispute({
      worker_user_id: workerId,
      pay_slip_id: (fd.get('pay_slip_id') as string) || null,
      subject: fd.get('subject') as string,
      description: fd.get('description') as string,
    })
    if (error) { toast(`Could not submit dispute: ${error}`, 'error'); return }
    toast('Dispute submitted for review', 'success')
    ;(e.target as HTMLFormElement).reset()
    load()
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {appUser?.display_name ?? 'there'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your earnings, pay slips, and standing — updated in real time
          </p>
        </div>
        {contractStatus === 'terminated' && (
          <span className="rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-500/20">
            ⚫ Contract terminated — 5 warnings reached
          </span>
        )}
      </div>

      {/* Warning standing */}
      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Warning Standing
          </h2>
          <span className="text-xs text-muted-foreground">
            {activeWarnings.length} / {WARNING_DOTS} — 5 triggers automatic termination
          </span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: WARNING_DOTS }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-8 rounded-full ${
                i < activeWarnings.length
                  ? i < 2 ? 'bg-yellow-400' : i < 4 ? 'bg-orange-500' : 'bg-red-600'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
        {activeWarnings.length > 0 && (
          <div className="mt-3 space-y-2">
            {activeWarnings.map((w) => (
              <div key={w.id} className="rounded bg-background/50 px-3 py-2 text-xs">
                <p className="font-medium text-foreground">{w.reason}</p>
                {w.comment && <p className="text-muted-foreground mt-0.5">{w.comment}</p>}
                <p className="text-muted-foreground mt-0.5">{new Date(w.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Month</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{(summary?.month_hours ?? 0).toFixed(1)}h</p>
        </div>
        <div className="rounded-lg border border-ops/20 bg-ops/5 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logged Earnings</p>
          <p className="mt-2 text-2xl font-bold text-foreground">${(summary?.month_earnings_usd ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Expected Pay Slip</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {summary?.latest_expected_amount_usd != null ? `$${summary.latest_expected_amount_usd.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{summary?.latest_period_month} {summary?.latest_period_year}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Paid to Date</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">${(summary?.total_paid_usd ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Timesheet logging */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Log Hours Worked
          </h2>
          <form onSubmit={handleLogHours} className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
            <input name="work_date" type="date" defaultValue={new Date().toISOString().split('T')[0]}
              className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <input name="hours_worked" type="number" step="0.25" min="0.25" max="24" required placeholder="Hours"
              className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <input name="notes" placeholder="Notes (optional)"
              className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm sm:col-span-2" />
            <button type="submit" disabled={logging || !rate}
              className="flex items-center justify-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors disabled:opacity-50 sm:col-span-2">
              <Plus className="h-4 w-4" /> {logging ? 'Logging…' : `Log at $${rate}/hr`}
            </button>
          </form>
          {!rate && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
              No hourly rate on file yet — ask your admin to set one before logging hours.
            </p>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timesheets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No hours logged yet</p>
            ) : timesheets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-2 text-xs">
                <span>{new Date(t.work_date).toLocaleDateString()} — {t.hours_worked}h</span>
                <span className="font-semibold text-foreground">${(t.hours_worked * t.hourly_rate_usd).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Logged hours are a secondary reference — your official pay slip is the primary payment source.
          </p>
        </div>

        {/* Pay slips & payments */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pay Slips & Payments
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {paySlips.length === 0 && payments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No pay slips issued yet</p>
            ) : (
              <>
                {paySlips.map((p) => (
                  <div key={p.id} className="rounded bg-background/50 px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span>{p.period_month} {p.period_year} — expected</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">${p.expected_amount_usd.toLocaleString()}</span>
                      {p.slip_file_url && (
                        <button onClick={() => handleDownloadSlip(p.slip_file_url!)} className="font-medium text-ops hover:underline">
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {payments.map((p) => (
                  <div key={p.id} className="rounded bg-background/50 px-3 py-2 text-xs flex items-center justify-between">
                    <span>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Pending'} — {p.status}</span>
                    <span className={`font-semibold ${p.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                      ${p.amount_usd.toLocaleString()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Feedback */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Submit Feedback
          </h2>
          <p className="text-[10px] text-muted-foreground mb-2">Only Admins can see this — never your manager.</p>
          <form onSubmit={handleFeedback} className="space-y-2">
            <select name="category" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
              <option value="manager">About a manager</option>
              <option value="process">Work process</option>
              <option value="platform">Platform</option>
              <option value="other">Other</option>
            </select>
            <input name="subject" required placeholder="Subject"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <textarea name="message" required rows={2} placeholder="Your feedback"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors">
              Submit Feedback
            </button>
          </form>
          {feedback.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
              {feedback.map((f) => (
                <div key={f.id} className="rounded bg-background/50 px-3 py-1.5 text-xs text-muted-foreground">
                  {f.subject} — {new Date(f.created_at).toLocaleDateString()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disputes */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Gavel className="h-4 w-4" /> Raise a Dispute
          </h2>
          <form onSubmit={handleDispute} className="space-y-2">
            {paySlips.length > 0 && (
              <select name="pay_slip_id" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
                <option value="">No specific pay slip</option>
                {paySlips.map((p) => (
                  <option key={p.id} value={p.id}>{p.period_month} {p.period_year} (${p.expected_amount_usd})</option>
                ))}
              </select>
            )}
            <input name="subject" required placeholder="Subject"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <textarea name="description" required rows={2} placeholder="Describe the discrepancy"
              className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <button type="submit" className="w-full rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors">
              Submit Dispute
            </button>
          </form>
          {disputes.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto">
              {disputes.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">{d.subject}</span>
                  <span className="font-medium text-foreground capitalize">{d.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
