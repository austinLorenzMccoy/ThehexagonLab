import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
}

const mockServerClient = { auth: { getUser: vi.fn() }, from: vi.fn() }
const mockAdminResult = { from: vi.fn() }

const mockCreateServerClient = vi.fn().mockReturnValue(mockServerClient)
const mockCreateSupabaseClient = vi.fn().mockReturnValue(mockAdminResult)

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateSupabaseClient,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a server Supabase client with cookies', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const client = await createServerSupabaseClient()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) }),
    )
    expect(client).toBe(mockServerClient)
  })

  it('cookie adapter getAll delegates to cookieStore', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    await createServerSupabaseClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2].cookies
    cookiesArg.getAll()
    expect(mockCookieStore.getAll).toHaveBeenCalled()
  })

  it('cookie adapter setAll delegates to cookieStore.set', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    await createServerSupabaseClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2].cookies
    cookiesArg.setAll([
      { name: 'session', value: 'abc', options: { path: '/' } },
    ])
    expect(mockCookieStore.set).toHaveBeenCalledWith('session', 'abc', { path: '/' })
  })

  it('cookie adapter setAll swallows errors silently', async () => {
    mockCookieStore.set.mockImplementationOnce(() => { throw new Error('fail') })
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    await createServerSupabaseClient()
    const cookiesArg = mockCreateServerClient.mock.calls[0][2].cookies
    // Should not throw
    expect(() => {
      cookiesArg.setAll([{ name: 'x', value: 'y', options: {} }])
    }).not.toThrow()
  })
})

describe('createAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an admin client with service role key', async () => {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const client = createAdminClient()
    expect(mockCreateSupabaseClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-key',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    expect(client).toBe(mockAdminResult)
  })
})
