import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

let exchangeResult: any

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(() => Promise.resolve(exchangeResult)),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET } from '@/app/auth/callback/route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /auth/callback', () => {
  it('redirects to /dashboard on successful code exchange', async () => {
    exchangeResult = { error: null }
    const req = new NextRequest('http://localhost/auth/callback?code=abc123')
    const res = await GET(req)
    expect(res.status).toBe(307) // NextResponse.redirect
    expect(res.headers.get('Location')).toContain('/dashboard')
  })

  it('redirects to custom next URL on success', async () => {
    exchangeResult = { error: null }
    const req = new NextRequest('http://localhost/auth/callback?code=abc123&next=/admin')
    const res = await GET(req)
    expect(res.headers.get('Location')).toContain('/admin')
  })

  it('redirects to login with error when no code provided', async () => {
    const req = new NextRequest('http://localhost/auth/callback')
    const res = await GET(req)
    expect(res.headers.get('Location')).toContain('/?error=auth_failed')
  })

  it('redirects to login with error when exchange fails', async () => {
    exchangeResult = { error: { message: 'invalid code' } }
    const req = new NextRequest('http://localhost/auth/callback?code=bad')
    const res = await GET(req)
    expect(res.headers.get('Location')).toContain('/?error=auth_failed')
  })
})
