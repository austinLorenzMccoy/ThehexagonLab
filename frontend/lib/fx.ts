/**
 * lib/fx.ts — Server-only USD -> payout-currency conversion.
 *
 * Every stored amount in this app (`_usd` fields) is USD-denominated.
 * Workers/referrers can request settlement in NGN or USD (see
 * app_users.payout_currency); this converts at a live rate right
 * before a Paystack transfer, and returns enough detail
 * (currency/rate/settled amount) for the caller to persist an audit
 * trail. Never guesses a stale rate — if the lookup fails, callers
 * must degrade (don't pay) rather than send a wrong amount. See
 * doc/paystack_integration_guide.md gap #2.
 */

interface FxResult {
  ok: true
  currency: 'USD' | 'NGN'
  rate: number
  amountSettled: number
}
interface FxError {
  ok: false
  message: string
}

let cachedNgnRate: { rate: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h — rate moves slowly, no need to refetch per request

async function fetchUsdToNgnRate(): Promise<number | null> {
  if (cachedNgnRate && Date.now() - cachedNgnRate.fetchedAt < CACHE_TTL_MS) {
    return cachedNgnRate.rate
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) return null
    const json = await res.json()
    const rate = json?.rates?.NGN
    if (typeof rate !== 'number' || rate <= 0) return null
    cachedNgnRate = { rate, fetchedAt: Date.now() }
    return rate
  } catch {
    return null
  }
}

/** Converts a USD amount to the requested payout currency. Fails
 *  closed — returns `ok: false` rather than a guessed amount if the
 *  live rate can't be fetched. */
export async function convertUsdTo(amountUsd: number, currency: 'USD' | 'NGN'): Promise<FxResult | FxError> {
  if (currency === 'USD') {
    return { ok: true, currency: 'USD', rate: 1, amountSettled: Math.round(amountUsd * 100) / 100 }
  }
  const rate = await fetchUsdToNgnRate()
  if (!rate) {
    return {
      ok: false,
      message: 'Could not fetch a live USD→NGN exchange rate. Try again shortly, or settle this payment manually.',
    }
  }
  return { ok: true, currency: 'NGN', rate, amountSettled: Math.round(amountUsd * rate * 100) / 100 }
}
