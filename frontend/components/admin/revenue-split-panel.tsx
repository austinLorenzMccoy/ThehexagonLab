'use client'

import { useEffect, useState } from 'react'
import { fetchPlatformRevenueSplits, upsertPlatformRevenueSplit } from '@/lib/db'
import type { PlatformRevenueSplit } from '@/types'
import { Loader2, Percent } from 'lucide-react'

interface Props {
  platformId: number
}

type FormState = { client: string; company: string; referral: string; worker: string }

const emptyForm: FormState = { client: '', company: '', referral: '', worker: '' }

/**
 * Admin-only revenue split for one platform — client / company /
 * referral / worker percentages, summing to 100%. Confidential: the
 * underlying table is RLS-gated to role='admin', so this only ever
 * renders meaningful data for an admin viewer (see
 * backend/supabase/migrations/20260904000000_revenue_split_percentages.sql).
 * Workers/referrers get their per-worker/per-referral override
 * elsewhere (Control Tower, Referrals & Payouts) — this is just the
 * platform-wide default that those fall back to.
 */
export function RevenueSplitPanel({ platformId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPlatformRevenueSplits().then((rows) => {
      if (cancelled) return
      const row = rows.find((r) => r.platform_id === platformId)
      setForm({
        client: row?.client_percentage != null ? String(row.client_percentage) : '',
        company: row?.company_percentage != null ? String(row.company_percentage) : '',
        referral: row?.referral_percentage != null ? String(row.referral_percentage) : '',
        worker: row?.worker_percentage != null ? String(row.worker_percentage) : '',
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [platformId])

  const total = [form.client, form.company, form.referral, form.worker]
    .reduce((sum, v) => sum + (v === '' ? 0 : Number(v)), 0)
  const allFilled = form.client !== '' && form.company !== '' && form.referral !== '' && form.worker !== ''
  const balanced = !allFilled || Math.abs(total - 100) < 0.01

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const toNum = (v: string): number | null => (v === '' ? null : Number(v))
    const entry: Omit<PlatformRevenueSplit, 'updated_at'> = {
      platform_id: platformId,
      client_percentage: toNum(form.client),
      company_percentage: toNum(form.company),
      referral_percentage: toNum(form.referral),
      worker_percentage: toNum(form.worker),
    }
    const { error } = await upsertPlatformRevenueSplit(entry)
    setSaving(false)
    setMessage(error ? `Failed: ${error}` : 'Saved')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Percent className="h-3.5 w-3.5" /> Revenue Split (admin-only)
      </p>
      <p className="text-[10px] text-muted-foreground">
        Default split for this platform, out of 100%. Never shown to workers or referrers —
        only the resulting dollar amounts are. Override per worker in Control Tower, or per
        referral in Referrals &amp; Payouts, for a unique deal.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['client', 'Client %'],
          ['company', 'Company %'],
          ['referral', 'Referral %'],
          ['worker', 'Worker %'],
        ] as const).map(([key, label]) => (
          <label key={key} className="space-y-1">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <input
              type="number" step="0.01" min="0" max="100"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !balanced}
          className="rounded bg-ops px-3 py-1.5 text-[10px] font-medium text-white hover:bg-ops-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Split'}
        </button>
        {allFilled && (
          <span className={`text-[10px] ${balanced ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'}`}>
            Total: {total.toFixed(2)}% {!balanced && '— must equal 100%'}
          </span>
        )}
        {message && <span className="text-[10px] text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
