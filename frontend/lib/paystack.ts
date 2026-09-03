/**
 * lib/paystack.ts — Server-only Paystack Transfer API client.
 *
 * Used to pay out approved `payout_requests` (referral commissions and
 * worker early-pay) and, eventually, month-end worker payments. Mirrors
 * the "graceful degradation without keys" pattern used elsewhere in this
 * repo (see lib/demo.ts / doc/backend_wiring_guide.md): every function
 * here returns a typed `{ ok: false, reason: 'not_configured' }` result
 * instead of throwing when `PAYSTACK_SECRET_KEY` isn't set, so payouts
 * degrade to "approve now, settle manually" rather than crashing.
 *
 * NEVER import this file from client components — the secret key must
 * only ever be read on the server (API routes / edge functions).
 */

import { createHmac, timingSafeEqual } from 'crypto'

const PAYSTACK_API = 'https://api.paystack.co'

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY
  return key && key.length > 0 ? key : null
}

export function isPaystackConfigured(): boolean {
  return secretKey() !== null
}

type PaystackResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'not_configured' }
  | { ok: false; reason: 'request_failed'; message: string }

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<PaystackResult<T>> {
  const key = secretKey()
  if (!key) return { ok: false, reason: 'not_configured' }

  try {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    const json = await res.json()
    if (!res.ok || json?.status === false) {
      return { ok: false, reason: 'request_failed', message: json?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json.data as T }
  } catch (err: any) {
    return { ok: false, reason: 'request_failed', message: err?.message ?? 'Network error' }
  }
}

interface PaystackTransferRecipient {
  recipient_code: string
}

/** Create a transfer recipient for a worker/referrer's bank account.
 *  Amounts on this platform are USD-denominated demo figures; wire the
 *  real `bank_code` / `account_number` / `currency` once the client
 *  confirms payout rails (Paystack supports NGN/GHS/ZAR/KES natively). */
export async function createTransferRecipient(params: {
  name: string
  accountNumber: string
  bankCode: string
  currency?: string
}): Promise<PaystackResult<PaystackTransferRecipient>> {
  return paystackFetch<PaystackTransferRecipient>('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: params.name,
      account_number: params.accountNumber,
      bank_code: params.bankCode,
      currency: params.currency ?? 'NGN',
    }),
  })
}

interface PaystackTransfer {
  reference: string
  status: string
  transfer_code: string
}

/** Initiate a payout transfer. `amountUsd` is converted to the smallest
 *  currency unit (kobo/cents) by the caller — Paystack expects an
 *  integer. Reason is shown on the recipient's bank statement. */
export async function initiateTransfer(params: {
  recipientCode: string
  amountMinorUnits: number
  reason: string
  reference: string
}): Promise<PaystackResult<PaystackTransfer>> {
  return paystackFetch<PaystackTransfer>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: params.amountMinorUnits,
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
    }),
  })
}

export async function verifyTransfer(reference: string): Promise<PaystackResult<PaystackTransfer>> {
  return paystackFetch<PaystackTransfer>(`/transfer/verify/${encodeURIComponent(reference)}`)
}

interface PaystackBank {
  name: string
  code: string
  currency: string
}

/** Lists banks Paystack supports for a country/currency — feeds the
 *  recipient-creation UI's bank picker (see gap #1). */
export async function listBanks(params?: { country?: string; currency?: string }): Promise<PaystackResult<PaystackBank[]>> {
  const qs = new URLSearchParams()
  qs.set('country', params?.country ?? 'nigeria')
  if (params?.currency) qs.set('currency', params.currency)
  return paystackFetch<PaystackBank[]>(`/bank?${qs.toString()}`)
}

/** Verifies Paystack's webhook signature — HMAC-SHA512 of the raw
 *  request body, keyed by the secret key (see
 *  https://paystack.com/docs/payments/webhooks/). Callers must pass
 *  the exact raw request body text, not a re-serialized/parsed
 *  version, or the hash won't match. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const key = secretKey()
  if (!key || !signatureHeader) return false
  const expected = createHmac('sha512', key).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signatureHeader, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}
