'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { fetchReferralSummary, fetchReferrals, fetchMyPayoutRequests, requestPayout } from '@/lib/db'
import type { ReferralSummaryRow, ReferralRow, PayoutRequestRow } from '@/types'
import { Loader2, Users, Trophy, DollarSign, Lock } from 'lucide-react'

const STATUS_STYLE: Record<ReferralRow['status'], string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  active: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  paid: 'bg-green-500/10 text-green-700 dark:text-green-400',
}
const STATUS_DOT: Record<ReferralRow['status'], string> = {
  pending: '🟡', active: '🔵', paid: '🟢',
}

/** Worker Recovery System — referral portal for role === 'referrer'.
 *  Payout requests are gated: they stay disabled until every referred
 *  worker shows a "paid" status. See PRD §4.8. */
export function ReferrerPortal() {
  const { appUser } = useAuth()
  const { toast } = useToast()
  const referrerId = appUser!.id

  const [summary, setSummary] = useState<ReferralSummaryRow | null>(null)
  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(async () => {
    const [s, r, p] = await Promise.all([
      fetchReferralSummary(referrerId),
      fetchReferrals(referrerId),
      fetchMyPayoutRequests(referrerId),
    ])
    setSummary(s); setReferrals(r); setPayouts(p)
    setLoading(false)
  }, [referrerId])

  useEffect(() => { load() }, [load])

  const eligible = summary?.eligible_for_payout ?? false
  const hasPendingRequest = payouts.some((p) => p.status === 'pending' || p.status === 'approved')

  const handleRequestPayout = async () => {
    setRequesting(true)
    const { error } = await requestPayout({
      requester_user_id: referrerId,
      type: 'referral_commission',
      amount_usd: summary?.total_commission_usd ?? 0,
    })
    setRequesting(false)
    if (error) { toast(`Payout request blocked: ${error}`, 'error'); return }
    toast('Payout requested — an admin will review it', 'success')
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const ranked = [...referrals].sort((a, b) => b.commission_usd - a.commission_usd)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Referral Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary?.referral_code ? `Your code: ${summary.referral_code}` : 'Track everyone you referred and their status'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Referred</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{summary?.total_referred ?? 0}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fully Paid</p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">{summary?.paid_count ?? 0}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Still Unpaid</p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {(summary?.total_referred ?? 0) - (summary?.paid_count ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border border-ops/20 bg-ops/5 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Potential Commission</p>
          <p className="mt-2 text-2xl font-bold text-foreground">${(summary?.total_commission_usd ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Payout gating */}
      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Request Payout</p>
              <p className="text-xs text-muted-foreground">
                {eligible
                  ? 'All referred workers are paid — you can request your commission.'
                  : 'Disabled until every referred worker shows a green (paid) status.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestPayout}
            disabled={!eligible || requesting || hasPendingRequest}
            className="flex items-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {!eligible && <Lock className="h-4 w-4" />}
            {hasPendingRequest ? 'Request Pending' : requesting ? 'Requesting…' : 'Request Payout'}
          </button>
        </div>
      </div>

      {/* Referred workers */}
      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Referred Workers
        </h2>
        {referrals.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No referrals yet</p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{r.referred_name}</p>
                  <p className="text-xs text-muted-foreground">{r.referred_email ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                    {STATUS_DOT[r.status]} {r.status}
                  </span>
                  <span className="text-sm font-semibold text-foreground w-16 text-right">
                    ${r.commission_usd.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard (top referrals by commission) */}
      {ranked.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Top Referrals
          </h2>
          <div className="space-y-1.5">
            {ranked.slice(0, 5).map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center font-bold text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 text-foreground">{r.referred_name}</span>
                <span className="font-semibold text-foreground">${r.commission_usd.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {payouts.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Payout Requests</h2>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-2 text-xs">
                <span>{new Date(p.requested_at).toLocaleDateString()}</span>
                <span className="font-medium text-foreground capitalize">{p.status}</span>
                <span className="font-semibold text-foreground">${p.amount_usd.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
