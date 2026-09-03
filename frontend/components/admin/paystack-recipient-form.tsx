'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  userId: string
  defaultAccountName: string
  payoutCurrency: 'NGN' | 'USD'
  onCreated: () => void
}

interface Bank {
  name: string
  code: string
  currency: string
}

/**
 * Admin-only — creates a Paystack Transfer Recipient for a worker's/
 * referrer's bank account via POST /api/paystack/recipients, replacing
 * the manual curl step in doc/paystack_integration_guide.md §3 Step 5
 * (gap #1). Uses the target user's own payout_currency preference
 * (set by them — see command-strip.tsx) as the recipient's settlement
 * currency, so it always matches what /api/payments|payouts/process
 * will later convert to.
 */
export function PaystackRecipientForm({ userId, defaultAccountName, payoutCurrency, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [accountName, setAccountName] = useState(defaultAccountName)
  const [accountNumber, setAccountNumber] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open || banks.length > 0) return
    setLoadingBanks(true)
    fetch(`/api/paystack/banks?currency=${payoutCurrency}`)
      .then((res) => res.json())
      .then((data) => setBanks(Array.isArray(data) ? data : []))
      .catch(() => setBanks([]))
      .finally(() => setLoadingBanks(false))
  }, [open, banks.length, payoutCurrency])

  const create = async () => {
    if (!accountName || !accountNumber || !bankCode) {
      setMessage('Fill in account name, number, and bank first')
      return
    }
    setCreating(true)
    setMessage(null)
    const res = await fetch('/api/paystack/recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, accountName, accountNumber, bankCode }),
    })
    const data = await res.json().catch(() => ({}))
    setCreating(false)
    if (!res.ok) {
      setMessage(data.error || 'Could not create recipient')
      return
    }
    setMessage('Recipient created and payout code saved')
    setAccountNumber('')
    setBankCode('')
    onCreated()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-[10px] font-medium text-ops hover:underline"
      >
        Create via Paystack instead of pasting a code
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-border-subtle bg-background/50 p-2.5 space-y-2">
      <p className="text-[10px] text-muted-foreground">
        Settlement currency: <span className="font-medium text-foreground">{payoutCurrency}</span> (set by this
        person in their own Account Settings)
      </p>
      <input
        type="text"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        placeholder="Account holder name"
        className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs"
      />
      <input
        type="text"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        placeholder="Account number"
        className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs"
      />
      {loadingBanks ? (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading banks…
        </div>
      ) : (
        <select
          value={bankCode}
          onChange={(e) => setBankCode(e.target.value)}
          className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs"
        >
          <option value="">Select bank…</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="rounded bg-ops px-2.5 py-1 text-[10px] font-medium text-white hover:bg-ops-dark disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create Recipient'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:underline">
          Cancel
        </button>
        {message && <span className="text-[10px] text-muted-foreground">{message}</span>}
      </div>
    </div>
  )
}
