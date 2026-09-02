'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  fetchAllWorkerEarningsSummaries,
  fetchAllPaySlips,
  fetchAllPayments,
  issuePaySlip,
  uploadPaySlipFile,
  getPaySlipFileUrl,
  recordPaySlipPayment,
  fetchPlatforms,
} from '@/lib/db'
import type { WorkerEarningsSummaryRow, PaySlipRow, PaymentRow, PaySlipMonth, Platform } from '@/types'
import { Loader2, Receipt, Upload, FileText, Wallet, Check } from 'lucide-react'

const MONTHS: PaySlipMonth[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Admin-only — official pay-slip issuance. Per
 *  doc/Worker_Recovery_System_PRD.md §3/§4.3, only Admins upload pay
 *  slips (payslips_insert RLS restricts this to role = 'admin', not
 *  manager). Workers see their own slips read-only on /dashboard. */
export default function PaySlipsPage() {
  const { hasAccess, appUser } = useAuth()
  const { toast } = useToast()

  const [workers, setWorkers] = useState<WorkerEarningsSummaryRow[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [slips, setSlips] = useState<PaySlipRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [w, p, s, pm] = await Promise.all([
      fetchAllWorkerEarningsSummaries(), fetchPlatforms(), fetchAllPaySlips(), fetchAllPayments(),
    ])
    setWorkers(w); setPlatforms(p); setSlips(s); setPayments(pm)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (!hasAccess('pay-slips')) return <AccessDenied />

  const workerLabel = (id: string) => {
    const w = workers.find((x) => x.worker_user_id === id)
    return w?.display_name ?? w?.email ?? id
  }

  const handleIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!appUser) return
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const workerUserId = fd.get('worker_user_id') as string
    const platformId = fd.get('platform_id') as string
    const file = fd.get('file') as File | null

    let slipFileUrl: string | null = null
    if (file && file.size > 0) {
      const { path, error: uploadError } = await uploadPaySlipFile(workerUserId, file)
      if (uploadError) {
        toast(`File upload failed (${uploadError}) — issuing pay slip without it`, 'info')
      } else {
        slipFileUrl = path
      }
    }

    const { error } = await issuePaySlip({
      worker_user_id: workerUserId,
      platform_id: platformId ? Number(platformId) : null,
      period_month: fd.get('period_month') as PaySlipMonth,
      period_year: Number(fd.get('period_year')),
      expected_amount_usd: Number(fd.get('expected_amount_usd')),
      currency: (fd.get('currency') as string) || 'USD',
      slip_file_url: slipFileUrl,
      issued_by: appUser.id,
      notes: (fd.get('notes') as string) || null,
    })

    setSubmitting(false)
    if (error) { toast(`Could not issue pay slip: ${error}`, 'error'); return }
    toast('Pay slip issued', 'success')
    ;(e.target as HTMLFormElement).reset()
    load()
  }

  const handleDownload = async (path: string) => {
    const url = await getPaySlipFileUrl(path)
    if (!url) { toast('Could not generate a download link', 'error'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  /** Month-end settlement (PRD §4.3 step 2) — tries a real Paystack
   *  transfer first; if Paystack isn't configured or the worker has no
   *  recipient code on file, degrades to recording the payment manually
   *  so an admin settling off-platform is never blocked. */
  const handleMarkPaid = async (slip: PaySlipRow) => {
    setPayingId(slip.id)
    const res = await fetch('/api/payments/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paySlipId: slip.id }),
    })
    const body = await res.json().catch(() => ({}))
    if (body?.processed) {
      toast('Payment sent via Paystack', 'success')
      setPayingId(null)
      load()
      return
    }
    // Only degrade to manual recording when Paystack wasn't actually
    // attempted (not configured / no recipient on file). A real transfer
    // attempt that failed (reason: 'request_failed') or a hard validation
    // error must NOT be silently recorded as paid.
    const degradable = body?.reason === 'not_configured' || body?.reason === 'no_recipient'
    if (!degradable) {
      toast(body?.message || body?.error || 'Could not process payment', 'error')
      setPayingId(null)
      return
    }
    if (body?.message) toast(body.message, 'info')
    const { error } = await recordPaySlipPayment(
      { worker_user_id: slip.worker_user_id, pay_slip_id: slip.id, amount_usd: slip.expected_amount_usd, status: 'paid' },
      appUser?.id
    )
    setPayingId(null)
    if (error) { toast(`Could not record payment: ${error}`, 'error'); return }
    toast('Payment recorded', 'success')
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pay Slips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issue official mid-month pay slips — workers see the expected amount on their dashboard
        </p>
      </div>

      <form onSubmit={handleIssue} className="grid grid-cols-1 gap-3 rounded-lg border border-ops/20 bg-ops/5 p-6 sm:grid-cols-3">
        <select name="worker_user_id" required className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
          <option value="">Select worker…</option>
          {workers.map((w) => (
            <option key={w.worker_user_id} value={w.worker_user_id}>{w.display_name ?? w.email}</option>
          ))}
        </select>
        <select name="platform_id" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
          <option value="">Platform (optional)</option>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
          ))}
        </select>
        <select name="period_month" required defaultValue={MONTHS[new Date().getMonth()]} className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input name="period_year" type="number" required defaultValue={new Date().getFullYear()}
          className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
        <input name="expected_amount_usd" type="number" step="0.01" min="0" required placeholder="Expected amount (USD)"
          className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
        <input name="currency" defaultValue="USD" placeholder="Currency"
          className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
        <input name="notes" placeholder="Notes (optional)"
          className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-border-subtle bg-background px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:border-ops/50">
          <Upload className="h-3.5 w-3.5 shrink-0" />
          <input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" className="w-full text-xs file:hidden" />
        </label>
        <button type="submit" disabled={submitting}
          className="rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors disabled:opacity-50 sm:col-span-3">
          {submitting ? 'Issuing…' : 'Issue Pay Slip'}
        </button>
      </form>

      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4" /> Issued Pay Slips
        </h2>
        {slips.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No pay slips issued yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Expected</th>
                  <th className="py-2 pr-3">Issued</th>
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {slips.map((s) => {
                  const paid = payments.some((p) => p.pay_slip_id === s.id && p.status === 'paid')
                  return (
                    <tr key={s.id}>
                      <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">{workerLabel(s.worker_user_id)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{s.period_month} {s.period_year}</td>
                      <td className="py-2 pr-3">{s.currency} {s.expected_amount_usd.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(s.issued_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-3">
                        {s.slip_file_url ? (
                          <button onClick={() => handleDownload(s.slip_file_url!)} className="flex items-center gap-1 text-xs font-medium text-ops hover:underline">
                            <FileText className="h-3 w-3" /> View
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No file</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {paid ? (
                          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(s)}
                            disabled={payingId === s.id}
                            className="flex items-center gap-1 rounded-full bg-ops px-2 py-0.5 text-[10px] font-medium text-white hover:bg-ops-dark transition-colors disabled:opacity-50"
                          >
                            <Wallet className="h-3 w-3" /> {payingId === s.id ? 'Processing…' : 'Mark Paid'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
