import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateBrowserClient = vi.fn().mockReturnValue({ from: vi.fn() })

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

// Set env vars before import
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

describe('createClient (browser)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a browser Supabase client with env vars', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
    )
    expect(client).toBeDefined()
  })

  it('returns the same client shape each call', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const c1 = createClient()
    const c2 = createClient()
    expect(c1).toBeDefined()
    expect(c2).toBeDefined()
    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2)
  })
})
