import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function makeQueryChain(data: any = null, error: any = null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
  Object.defineProperty(chain, 'then', {
    value: (onFulfilled: any) => Promise.resolve({ data, error }).then(onFulfilled),
    writable: true,
  })
  return chain
}

let authUserResult: any
let appUserQuery: any
let tableQuery: any

const mockSupabase: any = {
  auth: { getUser: vi.fn(() => Promise.resolve(authUserResult)) },
  from: vi.fn((table: string) => {
    if (table === 'app_users') return appUserQuery
    return tableQuery
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET } from '@/app/api/export/[table]/route'

beforeEach(() => {
  vi.clearAllMocks()
  authUserResult = { data: { user: { id: 'u1' } } }
  appUserQuery = makeQueryChain({ role: 'admin' })
})

describe('GET /api/export/[table]', () => {
  it('returns 401 when not authenticated', async () => {
    authUserResult = { data: { user: null } }
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not admin or manager', async () => {
    appUserQuery = makeQueryChain({ role: 'worker' })
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid table name', async () => {
    const req = new NextRequest('http://localhost/api/export/invalid_table')
    const res = await GET(req, { params: { table: 'invalid_table' } })
    expect(res.status).toBe(400)
  })

  it('returns empty CSV when no data', async () => {
    tableQuery = makeQueryChain([])
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    expect(res.headers.get('Content-Type')).toBe('text/csv')
    expect(res.headers.get('Content-Disposition')).toContain('worker_tracker.csv')
  })

  it('returns CSV with headers and data', async () => {
    tableQuery = makeQueryChain([{ id: '1', name: 'Test', status: '✅ Yes' }])
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    const text = await res.text()
    expect(text).toContain('id,name,status')
    expect(text).toContain('"1"')
    expect(text).toContain('"Test"')
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
  })

  it('applies platform filter when provided', async () => {
    tableQuery = makeQueryChain([{ id: '1', name: 'Test', platforms: { slug: 'oneforma' } }])
    const req = new NextRequest('http://localhost/api/export/worker_tracker?platform=oneforma')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    const text = await res.text()
    // platforms column should be filtered out
    expect(text).not.toContain('platforms')
    expect(res.headers.get('Content-Disposition')).toContain('worker_tracker_oneforma.csv')
  })

  it('returns 500 on query error', async () => {
    tableQuery = makeQueryChain(null, { message: 'query fail' })
    const req = new NextRequest('http://localhost/api/export/payroll')
    const res = await GET(req, { params: { table: 'payroll' } })
    expect(res.status).toBe(500)
  })

  it('handles null values in CSV output', async () => {
    tableQuery = makeQueryChain([{ id: '1', name: null }])
    const req = new NextRequest('http://localhost/api/export/workers_registry')
    const res = await GET(req, { params: { table: 'workers_registry' } })
    const text = await res.text()
    expect(text).toContain('id,name')
    // null should render as empty
    expect(text.split('\n')[1]).toContain(',')
  })

  it('handles object values in CSV output (JSONB)', async () => {
    tableQuery = makeQueryChain([{ id: '1', data: { key: 'val' } }])
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    const text = await res.text()
    expect(text).toContain('id,data')
  })

  it('escapes double quotes in CSV values', async () => {
    tableQuery = makeQueryChain([{ id: '1', name: 'Test "quoted"' }])
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    const text = await res.text()
    expect(text).toContain('""quoted""')
  })

  it('allows manager role', async () => {
    appUserQuery = makeQueryChain({ role: 'manager' })
    tableQuery = makeQueryChain([])
    const req = new NextRequest('http://localhost/api/export/payroll')
    const res = await GET(req, { params: { table: 'payroll' } })
    // Should not be 403
    expect(res.status).not.toBe(403)
  })

  it('defaults filename suffix to all when no platform', async () => {
    tableQuery = makeQueryChain([{ id: '1' }])
    const req = new NextRequest('http://localhost/api/export/worker_tracker')
    const res = await GET(req, { params: { table: 'worker_tracker' } })
    expect(res.headers.get('Content-Disposition')).toContain('worker_tracker_all.csv')
  })
})
