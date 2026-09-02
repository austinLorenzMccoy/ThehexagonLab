'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  fetchAllReferrals, updateReferralStatus, addReferral,
  fetchAllPayoutRequests, updatePayoutRequest, fetchAllUsers,
} from '@/lib/db'
import type { ReferralRow, ReferralStatus, PayoutRequestRow, AppUser } from '@/types'
import { Loader2, UserPlus, Wallet, Plus } from 'lucide-react'

const REFERRAL_STATUSES: ReferralStatus[] = ['pending', 'active', 'paid']

/** Admin oversight of referrals and payout approvals. Referrers manage
 *  nothing here — they see their own read-only view on /dashboard via
 *  ReferrerPortal. The "all referred workers must be paid" gate is
 *  enforced in the database (trg_payout_gating), not just in the UI. */
export default function ReferralsAdminPage() {
  const { hasAccess, appUser } = useAuth()
  const { toast } = useToast()

  const [referrals, setReferrals] = useState<ReferralRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRequestRow[]>([])
  const [referrers, setReferrers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const [r, p, users] = await Promise.all([fetchAllReferrals(), fetchAllPayoutRequests(), fetchAllUsers()])
    setReferrals(r); setPayouts(p)
    setReferrers(users.filter((u) => u.role === 'referrer'))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (!hasAccess('referrals')) return <AccessDenied />

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { error } = await addReferral({
      referrer_user_id: fd.get('referrer_user_id') as string,
      referred_worker_user_id: null,
      referred_name: fd.get('referred_name') as string,
      referred_email: (fd.get('referred_email') as string) || null,
    })
    if (error) { toast(`Could not add referral: ${error}`, 'error'); return }
    toast('Referral added', 'success')
    setShowForm(false)
    load()
  }

  const handleStatus = async (id: string, status: ReferralStatus) => {
    const { error } = await updateReferralStatus(id, status)
    if (error) { toast(`Could not update: ${error}`, 'error'); return }
    load()
  }

  const handlePayout = async (id: string, status: PayoutRequestRow['status']) => {
    // "Mark Paid" tries a real Paystack transfer first; if Paystack isn't
    // wired up yet (or the requester has no recipient code on file) it
    // degrades to a manual status update so admins are never blocked.
    if (status === 'paid') {
      const res = await fetch('/api/payouts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutRequestId: id }),
      })
      const body = await res.json().catch(() => ({}))
      if (body?.processed) {
        toast('Payout sent via Paystack', 'success')
        load()
        return
      }
      // Only degrade to a manual status update when Paystack wasn't
      // actually attempted. A real transfer attempt that failed
      // (reason: 'request_failed') or a hard validation error must NOT
      // be silently recorded as paid.
      const degradable = body?.reason === 'not_configured' || body?.reason === 'no_recipient'
      if (!degradable) {
        toast(body?.message || body?.error || 'Could not process payout', 'error')
        return
      }
      if (body?.message) toast(body.message, 'info')
    }
    const { error } = await updatePayoutRequest(id, { status }, appUser?.id)
    if (error) { toast(`Could not update payout: ${error}`, 'error'); return }
    toast(`Payout marked ${status}`, 'success')
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referrals & Payouts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage referral status and approve gated payout requests
          </p>
        </div>
        {referrers.length > 0 && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors"
          >
            <Plus className="h-4 w-4" /> New Referral
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-ops/20 bg-ops/5 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select name="referrer_user_id" required className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
              {referrers.map((r) => (
                <option key={r.id} value={r.id}>{r.display_name ?? r.email} ({r.referral_code})</option>
              ))}
            </select>
            <input name="referred_name" required placeholder="Referred person's name"
              className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
            <input name="referred_email" type="email" placeholder="Email (optional)"
              className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors">
            Save Referral
          </button>
        </form>
      )}

      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Referrals
        </h2>
        {referrals.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No referrals recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Referred</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Commission</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-medium text-foreground">{r.referred_name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.referred_email ?? '—'}</td>
                    <td className="py-2 pr-3">${r.commission_usd.toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatus(r.id, e.target.value as ReferralStatus)}
                        className="rounded border border-border-subtle bg-transparent px-1 py-0.5 text-xs"
                      >
                        {REFERRAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border-subtle bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4" /> Payout Requests
        </h2>
        {payouts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No payout requests yet</p>
        ) : (
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-background/50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground capitalize">{p.type.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.requested_at).toLocaleDateString()}</p>
                </div>
                <span className="font-semibold text-foreground">${p.amount_usd.toLocaleString()}</span>
                {p.status === 'pending' || p.status === 'approved' ? (
                  <div className="flex gap-1.5">
                    {p.status === 'pending' && (
                      <button onClick={() => handlePayout(p.id, 'approved')} className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium hover:bg-muted">
                        Approve
                      </button>
                    )}
                    <button onClick={() => handlePayout(p.id, 'paid')} className="rounded-full bg-ops px-2 py-0.5 text-[10px] font-medium text-white hover:bg-ops-dark">
                      Mark Paid
                    </button>
                    <button onClick={() => handlePayout(p.id, 'rejected')} className="rounded-full border border-red-500/30 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-500/10">
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{p.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
