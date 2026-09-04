import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────

function makeQueryChain(data: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
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
let createUserResult: any
let auditInsertQuery: any
let demoCookieValue: string | undefined

const mockSupabase = {
  auth: { getUser: vi.fn(() => Promise.resolve(authUserResult)) },
  from: vi.fn(() => appUserQuery),
}

const mockAdmin = {
  auth: { admin: { createUser: vi.fn(() => Promise.resolve(createUserResult)) } },
  from: vi.fn(() => auditInsertQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
  createAdminClient: vi.fn(() => mockAdmin),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => (demoCookieValue !== undefined ? { value: demoCookieValue } : undefined) })),
}))

import { POST } from '@/app/api/admin/users/invite/route'
import { NextRequest } from 'next/server'

const makeRequest = (body: any) =>
  new NextRequest('http://localhost/api/admin/users/invite', {
    method: 'POST',
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  demoCookieValue = undefined
  authUserResult = { data: { user: { id: 'admin-id' } } }
  appUserQuery = makeQueryChain({ role: 'admin' })
  createUserResult = { data: { user: { id: 'new-user-id' } }, error: null }
  auditInsertQuery = makeQueryChain(null)
})

describe('POST /api/admin/users/invite', () => {
  it('provisions an account and returns its userId', async () => {
    const res = await POST(makeRequest({ email: 'new.worker@example.com', displayName: 'New Worker' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('new-user-id')
  })

  it('creates the account with email_confirm true and no password', async () => {
    await POST(makeRequest({ email: 'new.worker@example.com', displayName: 'New Worker' }))
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'new.worker@example.com',
      email_confirm: true,
      user_metadata: { full_name: 'New Worker' },
    })
  })

  it('omits user_metadata when displayName is not provided', async () => {
    await POST(makeRequest({ email: 'new.worker@example.com' }))
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'new.worker@example.com',
      email_confirm: true,
      user_metadata: undefined,
    })
  })

  it('logs an audit entry on success', async () => {
    await POST(makeRequest({ email: 'new.worker@example.com', displayName: 'New Worker' }))
    expect(mockAdmin.from).toHaveBeenCalledWith('audit_log')
    expect(auditInsertQuery.insert).toHaveBeenCalledWith({
      user_id: 'admin-id',
      action: 'account_provisioned',
      entity_type: 'user',
      entity_id: 'new-user-id',
      details: { email: 'new.worker@example.com', display_name: 'New Worker' },
    })
  })

  it('returns 400 in demo preview mode', async () => {
    demoCookieValue = '1'
    const res = await POST(makeRequest({ email: 'new.worker@example.com' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('preview mode')
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('returns 403 when caller is not authenticated', async () => {
    authUserResult = { data: { user: null } }
    const res = await POST(makeRequest({ email: 'new.worker@example.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when caller is not admin', async () => {
    appUserQuery = makeQueryChain({ role: 'manager' })
    const res = await POST(makeRequest({ email: 'new.worker@example.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ displayName: 'No Email' }))
    expect(res.status).toBe(400)
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('returns 409 with a friendly message when the email already exists', async () => {
    createUserResult = { data: { user: null }, error: { message: 'A user with this email address has already been registered' } }
    const res = await POST(makeRequest({ email: 'dup@example.com' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('An account with this email already exists')
  })

  it('returns 500 with the raw message for other creation failures', async () => {
    createUserResult = { data: { user: null }, error: { message: 'Invalid email format' } }
    const res = await POST(makeRequest({ email: 'bad' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Invalid email format')
  })

  it('does not write an audit entry when account creation fails', async () => {
    createUserResult = { data: { user: null }, error: { message: 'boom' } }
    await POST(makeRequest({ email: 'bad@example.com' }))
    expect(mockAdmin.from).not.toHaveBeenCalledWith('audit_log')
  })
})
