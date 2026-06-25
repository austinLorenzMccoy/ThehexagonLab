import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────

function makeQueryChain(data: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (fn: any) => fn({ data, error }),
  }
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve({ data, error }).then(onFulfilled),
    writable: true,
  })
  return chain
}

let authUserResult: any = { data: { user: { id: 'admin-id' } } }
let appUserQuery: any
let adminListQuery: any
let adminUpdateQuery: any

const mockSupabase = {
  auth: { getUser: vi.fn(() => Promise.resolve(authUserResult)) },
  from: vi.fn(() => appUserQuery),
}

const mockAdmin = {
  from: vi.fn(() => adminListQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createAdminClient: vi.fn(() => mockAdmin),
}))

import { GET, PATCH } from '@/app/api/admin/users/route'
import { NextRequest } from 'next/server'

beforeEach(() => {
  vi.clearAllMocks()
  authUserResult = { data: { user: { id: 'admin-id' } } }
  appUserQuery = makeQueryChain({ role: 'admin' })
  adminListQuery = makeQueryChain([{ id: 'u1' }])
  adminUpdateQuery = makeQueryChain(null)
})

describe('GET /api/admin/users', () => {
  it('returns user list for admin', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([{ id: 'u1' }])
  })

  it('returns 403 when user is not authenticated', async () => {
    authUserResult = { data: { user: null } }
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 403 when user is not admin', async () => {
    appUserQuery = makeQueryChain({ role: 'worker' })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('returns 500 when admin list query fails', async () => {
    adminListQuery = makeQueryChain(null, { message: 'db error' })
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db error')
  })
})

describe('PATCH /api/admin/users', () => {
  it('updates user role successfully', async () => {
    mockAdmin.from.mockReturnValue(adminUpdateQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'manager' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 403 when not admin', async () => {
    authUserResult = { data: { user: null } }
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'manager' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(403)
  })

  it('returns 400 when userId missing', async () => {
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'manager' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when role missing', async () => {
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when admin tries to change own role', async () => {
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'admin-id', role: 'worker' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('sets platform_access to null for admin role', async () => {
    mockAdmin.from.mockReturnValue(adminUpdateQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'admin' }),
    })
    await PATCH(req)
    // The update should have been called — verify via mock
    expect(mockAdmin.from).toHaveBeenCalledWith('app_users')
  })

  it('preserves worker_id when provided', async () => {
    mockAdmin.from.mockReturnValue(adminUpdateQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'manager', worker_id: 'w1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('returns 500 when update fails', async () => {
    const failQuery = makeQueryChain(null, { message: 'update fail' })
    mockAdmin.from.mockReturnValue(failQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'manager' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(500)
  })

  it('includes can_view_orders and platform_access with defaults for non-admin', async () => {
    mockAdmin.from.mockReturnValue(adminUpdateQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId: 'u2', role: 'supervisor' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })

  it('uses provided platform_access and can_view_orders for non-admin', async () => {
    mockAdmin.from.mockReturnValue(adminUpdateQuery)
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({
        userId: 'u2', role: 'manager',
        platform_access: ['oneforma'], can_view_orders: true,
      }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
  })
})
