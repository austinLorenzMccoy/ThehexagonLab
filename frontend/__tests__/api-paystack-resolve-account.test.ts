import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────

function makeQueryChain(data: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve({ data, error }).then(onFulfilled),
    writable: true,
  })
  return chain
}

let authUserResult: any = { data: { user: { id: 'admin-id' } } }
let appUserQuery: any
let configured = true
let resolveResult: any

const mockSupabase = {
  auth: { getUser: vi.fn(() => Promise.resolve(authUserResult)) },
  from: vi.fn(() => appUserQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/paystack', () => ({
  isPaystackConfigured: vi.fn(() => configured),
  resolveAccountNumber: vi.fn(() => Promise.resolve(resolveResult)),
}))

import { GET } from '@/app/api/paystack/resolve-account/route'
import { NextRequest } from 'next/server'
import { resolveAccountNumber } from '@/lib/paystack'

const makeRequest = (params: Record<string, string>) => {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(`http://localhost/api/paystack/resolve-account?${qs}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  authUserResult = { data: { user: { id: 'admin-id' } } }
  appUserQuery = makeQueryChain({ role: 'admin' })
  configured = true
  resolveResult = { ok: true, data: { account_number: '0123456789', account_name: 'Ada Okonkwo', bank_id: 1 } }
})

describe('GET /api/paystack/resolve-account', () => {
  it('returns the resolved account on success', async () => {
    const res = await GET(makeRequest({ accountNumber: '0123456789', bankCode: '058' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ account_number: '0123456789', account_name: 'Ada Okonkwo', bank_id: 1 })
  })

  it('passes accountNumber and bankCode through to resolveAccountNumber', async () => {
    await GET(makeRequest({ accountNumber: '0123456789', bankCode: '058' }))
    expect(resolveAccountNumber).toHaveBeenCalledWith({ accountNumber: '0123456789', bankCode: '058' })
  })

  it('returns 403 when caller is not authenticated', async () => {
    authUserResult = { data: { user: null } }
    const res = await GET(makeRequest({ accountNumber: '0123456789', bankCode: '058' }))
    expect(res.status).toBe(403)
    expect(resolveAccountNumber).not.toHaveBeenCalled()
  })

  it('returns 403 when caller is not admin', async () => {
    appUserQuery = makeQueryChain({ role: 'manager' })
    const res = await GET(makeRequest({ accountNumber: '0123456789', bankCode: '058' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when Paystack is not configured', async () => {
    configured = false
    const res = await GET(makeRequest({ accountNumber: '0123456789', bankCode: '058' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('PAYSTACK_SECRET_KEY')
  })

  it('returns 400 when accountNumber is missing', async () => {
    const res = await GET(makeRequest({ bankCode: '058' }))
    expect(res.status).toBe(400)
    expect(resolveAccountNumber).not.toHaveBeenCalled()
  })

  it('returns 400 when bankCode is missing', async () => {
    const res = await GET(makeRequest({ accountNumber: '0123456789' }))
    expect(res.status).toBe(400)
    expect(resolveAccountNumber).not.toHaveBeenCalled()
  })

  it('returns 502 with the Paystack message when the lookup fails', async () => {
    resolveResult = { ok: false, reason: 'request_failed', message: 'Invalid account number' }
    const res = await GET(makeRequest({ accountNumber: '0000000000', bankCode: '058' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Invalid account number')
  })

  it('returns a generic 502 message when not_configured slips through', async () => {
    resolveResult = { ok: false, reason: 'not_configured' }
    const res = await GET(makeRequest({ accountNumber: '0000000000', bankCode: '058' }))
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('Could not reach Paystack.')
  })
})
