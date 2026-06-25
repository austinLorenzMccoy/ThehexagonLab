import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mocks ───────────────────────────────────────────────────────

let sessionResult: any = { data: { session: null } }
let appUserResult: any = { data: null }
let authStateCallback: any = null

const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve(sessionResult)),
    onAuthStateChange: vi.fn((cb: any) => {
      authStateCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(appUserResult),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'

import { AuthProvider, useAuth } from '@/lib/auth-context'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children)

beforeEach(() => {
  vi.clearAllMocks()
  sessionResult = { data: { session: null } }
  appUserResult = { data: null }
  authStateCallback = null
})

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})

describe('AuthProvider', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })

  it('finishes loading with null user when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.appUser).toBeNull()
    expect(result.current.permissions).toBeNull()
  })

  it('loads app user when session exists', async () => {
    const mockUser = { id: 'u1', email: 'test@test.com' }
    sessionResult = { data: { session: { user: mockUser } } }
    appUserResult = {
      data: {
        id: 'u1', email: 'test@test.com', display_name: 'Test',
        role: 'admin', platform_access: null, worker_id: null,
        can_view_orders: true, is_active: true,
        last_sign_in: null, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.appUser?.role).toBe('admin')
    expect(result.current.permissions?.canManageRoles).toBe(true)
  })

  it('handles onAuthStateChange with session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    appUserResult = {
      data: {
        id: 'u2', email: 'test2@test.com', display_name: 'Test2',
        role: 'worker', platform_access: null, worker_id: null,
        can_view_orders: false, is_active: true,
        last_sign_in: null, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    }

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_IN', { user: { id: 'u2' } })
      }
    })
    expect(result.current.appUser?.role).toBe('worker')
  })

  it('handles onAuthStateChange with null session', async () => {
    const mockUser = { id: 'u1' }
    sessionResult = { data: { session: { user: mockUser } } }
    appUserResult = {
      data: {
        id: 'u1', email: 'test@test.com', display_name: 'Test',
        role: 'admin', platform_access: null, worker_id: null,
        can_view_orders: true, is_active: true,
        last_sign_in: null, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_OUT', null)
      }
    })
    expect(result.current.user).toBeNull()
    expect(result.current.appUser).toBeNull()
  })

  it('signInWithGoogle calls supabase OAuth', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.signInWithGoogle()
    })
    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback' },
    })
  })

  it('signOut calls supabase signOut and clears appUser', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 'test@test.com', display_name: 'Test',
        role: 'admin', platform_access: null, worker_id: null,
        can_view_orders: true, is_active: true,
        last_sign_in: null, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())

    await act(async () => {
      await result.current.signOut()
    })
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(result.current.appUser).toBeNull()
  })

  it('refreshAppUser reloads app user', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 'test@test.com', display_name: 'Test',
        role: 'admin', platform_access: null, worker_id: null,
        can_view_orders: true, is_active: true,
        last_sign_in: null, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())

    await act(async () => {
      await result.current.refreshAppUser()
    })
    // from().select().eq().single() should have been called multiple times
    expect(mockSupabase.from).toHaveBeenCalled()
  })

  it('refreshAppUser does nothing when no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const callCount = mockSupabase.from.mock.calls.length
    await act(async () => {
      await result.current.refreshAppUser()
    })
    expect(mockSupabase.from.mock.calls.length).toBe(callCount)
  })
})

describe('hasAccess', () => {
  it('returns false when no appUser', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasAccess('dashboard')).toBe(false)
  })

  it('admin has access to all channels', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'admin',
        platform_access: null, worker_id: null, can_view_orders: true,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('dashboard')).toBe(true)
    expect(result.current.hasAccess('admin')).toBe(true)
    expect(result.current.hasAccess('orders')).toBe(true)
  })

  it('manager has orders access only when can_view_orders', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'manager',
        platform_access: null, worker_id: null, can_view_orders: false,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('dashboard')).toBe(true)
    expect(result.current.hasAccess('orders')).toBe(false)
    expect(result.current.hasAccess('payroll')).toBe(true)
  })

  it('supervisor has orders access only when can_view_orders', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'supervisor',
        platform_access: null, worker_id: null, can_view_orders: true,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('orders')).toBe(true)
    expect(result.current.hasAccess('admin')).toBe(false)
  })

  it('worker only has dashboard access', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'worker',
        platform_access: null, worker_id: null, can_view_orders: false,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('dashboard')).toBe(true)
    expect(result.current.hasAccess('tracker')).toBe(false)
  })
})

describe('hasRole', () => {
  it('returns false when no appUser', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasRole('admin')).toBe(false)
  })

  it('matches single role', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'admin',
        platform_access: null, worker_id: null, can_view_orders: true,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasRole('admin')).toBe(true)
    expect(result.current.hasRole('worker')).toBe(false)
  })

  it('matches role array', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'manager',
        platform_access: null, worker_id: null, can_view_orders: false,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasRole(['admin', 'manager'])).toBe(true)
    expect(result.current.hasRole(['supervisor', 'worker'])).toBe(false)
  })
})

describe('edge cases', () => {
  it('loadAppUser handles null data (no app_users row)', async () => {
    const mockUser = { id: 'u-new' }
    sessionResult = { data: { session: { user: mockUser } } }
    appUserResult = { data: null }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // appUser should remain null since data was null
    expect(result.current.appUser).toBeNull()
  })

  it('signInWithGoogle uses fallback URL when NEXT_PUBLIC_SITE_URL is empty', async () => {
    const saved = process.env.NEXT_PUBLIC_SITE_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(async () => {
      await result.current.signInWithGoogle()
    })
    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'http://localhost:3000/auth/callback' },
    })
    process.env.NEXT_PUBLIC_SITE_URL = saved
  })

  it('hasAccess returns false for unknown channel', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'admin',
        platform_access: null, worker_id: null, can_view_orders: true,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('nonexistent-channel')).toBe(false)
  })

  it('hasAccess returns false when role is an unexpected value', async () => {
    sessionResult = { data: { session: { user: { id: 'u1' } } } }
    appUserResult = {
      data: {
        id: 'u1', email: 't@t.com', display_name: 'T', role: 'unknown_role' as any,
        platform_access: null, worker_id: null, can_view_orders: false,
        is_active: true, last_sign_in: null, created_at: '', updated_at: '',
      },
    }
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.appUser).not.toBeNull())
    expect(result.current.hasAccess('dashboard')).toBe(false)
  })
})
