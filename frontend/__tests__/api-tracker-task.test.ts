import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function makeQueryChain(data: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve({ data, error }).then(onFulfilled),
    writable: true,
  })
  return chain
}

let authUserResult: any
let trackerQuery: any

const mockSupabase: any = {
  auth: { getUser: vi.fn(() => Promise.resolve(authUserResult)) },
  from: vi.fn(() => trackerQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { PATCH } from '@/app/api/tracker/task/route'

beforeEach(() => {
  vi.clearAllMocks()
  authUserResult = { data: { user: { id: 'u1' } } }
})

describe('PATCH /api/tracker/task', () => {
  it('returns 401 when not authenticated', async () => {
    authUserResult = { data: { user: null } }
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: '✅ Yes' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid status value', async () => {
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: 'INVALID' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid status')
  })

  it('returns 404 when row not found', async () => {
    trackerQuery = makeQueryChain(null, { message: 'not found' })
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: '✅ Yes' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
  })

  it('returns 404 when row is null without error', async () => {
    trackerQuery = makeQueryChain(null, null)
    // Override single to return no data and no error
    trackerQuery.single = vi.fn().mockResolvedValue({ data: null, error: null })
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: '✅ Yes' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(404)
  })

  it('merges task status and returns success', async () => {
    const readQ = makeQueryChain({ task_statuses: { T1: '❌ No' } })
    const writeQ = makeQueryChain(null, null)
    let call = 0
    mockSupabase.from.mockImplementation(() => {
      call++
      return call === 1 ? readQ : writeQ
    })
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T2', newStatus: '✅ Yes' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.merged).toEqual({ T1: '❌ No', T2: '✅ Yes' })
  })

  it('returns 500 when update fails', async () => {
    const readQ = makeQueryChain({ task_statuses: {} })
    const writeQ = makeQueryChain(null, { message: 'db fail' })
    let call = 0
    mockSupabase.from.mockImplementation(() => {
      call++
      return call === 1 ? readQ : writeQ
    })
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: '✅ Yes' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(500)
  })

  it('handles null task_statuses (spreads empty object)', async () => {
    const readQ = makeQueryChain({ task_statuses: null })
    const writeQ = makeQueryChain(null, null)
    let call = 0
    mockSupabase.from.mockImplementation(() => {
      call++
      return call === 1 ? readQ : writeQ
    })
    const req = new NextRequest('http://localhost/api/tracker/task', {
      method: 'PATCH',
      body: JSON.stringify({ rowId: 'r1', columnKey: 'T1', newStatus: '⏳ Pending' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.merged).toEqual({ T1: '⏳ Pending' })
  })
})
