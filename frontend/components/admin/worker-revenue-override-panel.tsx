'use client'

import { useEffect, useState } from 'react'
import { fetchWorkerRevenueOverride, upsertWorkerRevenueOverride } from '@/lib/db'
import type { WorkerRevenueOverride } from '@/types'
import { Loader2, Percent } from 'lucide-react'

interface Props {
  workerUserId: string
}

type FormState = { client: string; company: string; worker: string }

const emptyForm: FormState = { client: '', company: '', worker: '' }

/**
 * Admin-only, per-worker override of the platform's default revenue
 * split — for a unique deal negotiated with this specific worker.
 * Blank fields fall back to the platform default at calculation time
 * (see resolveRevenueSplit in lib/db.ts). Referral % lives on the
 * referral record instead (Referrals & Payouts), since a worker's
 * referral relationship is tracked there, not here.
 */
export function WorkerRevenueOverridePanel({ workerUserId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWorkerRevenueOverride(workerUserId).then((row) => {
      if (cancelled) return
      setForm({
        client: row?.client_percentage != null ? String(row.client_percentage) : '',
        company: row?.company_percentage != null ? String(row.company_percentage) : '',
        worker: row?.worker_percentage != null ? String(row.worker_percentage) : '',
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [workerUserId])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const toNum = (v: string): number | null => (v === '' ? null : Number(v))
    const entry: Omit<WorkerRevenueOverride, 'updated_at'> = {
      worker_user_id: workerUserId,
      client_percentage: toNum(form.client),
      company_percentage: toNum(form.company),
      worker_percentage: toNum(form.worker),
    }
    const { error } = await upsertWorkerRevenueOverride(entry)
    setSaving(false)
    setMessage(error ? `Failed: ${error}` : 'Saved')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5">
        <Percent className="h-3 w-3" /> Revenue Split Override (optional)
      </label>
      <div className="grid grid-cols-3 gap-2">
        {([
          ['client', 'Client %'],
          ['company', 'Company %'],
          ['worker', 'Worker %'],
        ] as const).map(([key, label]) => (
          <input
            key={key}
            type="number" step="0.01" min="0" max="100"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            placeholder={label}
            className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs"
          />
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-ops px-2.5 py-1 text-[10px] font-medium text-white hover:bg-ops-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Split Override'}
        </button>
        {message && <span className="text-[10px] text-muted-foreground">{message}</span>}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Blank fields fall back to this worker&apos;s platform default split. Never shown to the
        worker — only their resulting pay is.
      </p>
    </div>
  )
}
