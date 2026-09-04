'use client'

import { useEffect, useState } from 'react'
import { fetchReferrerRevenueOverride, upsertReferrerRevenueOverride } from '@/lib/db'
import type { ReferrerRevenueOverride } from '@/types'
import { Loader2, Percent } from 'lucide-react'

interface Props {
  referrerUserId: string
}

/**
 * Admin-only default commission % for this referrer's account —
 * applies to all their referrals unless a specific referral has its
 * own override (see the Commission % column on Referrals & Payouts).
 * Blank falls back to the platform default at calculation time (see
 * resolveRevenueSplit in lib/db.ts).
 */
export function ReferrerRevenueOverridePanel({ referrerUserId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchReferrerRevenueOverride(referrerUserId).then((row) => {
      if (cancelled) return
      setValue(row?.referral_percentage != null ? String(row.referral_percentage) : '')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [referrerUserId])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const entry: Omit<ReferrerRevenueOverride, 'updated_at'> = {
      referrer_user_id: referrerUserId,
      referral_percentage: value === '' ? null : Number(value),
    }
    const { error } = await upsertReferrerRevenueOverride(entry)
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
        <Percent className="h-3 w-3" /> Default Referral Commission % (optional)
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number" step="0.01" min="0" max="100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Platform default"
          className="w-32 rounded border border-border-subtle bg-background px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-ops px-2.5 py-1 text-[10px] font-medium text-white hover:bg-ops-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {message && <span className="text-[10px] text-muted-foreground">{message}</span>}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Used for every referral from this referrer unless that specific referral has its own
        Commission % set on Referrals &amp; Payouts. Never shown to the referrer — only their
        resulting commission_usd is.
      </p>
    </div>
  )
}
