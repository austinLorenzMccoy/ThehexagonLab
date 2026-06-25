'use client'

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { isDemoMode } from '@/lib/demo'
import type { AppUser, UserPermissions, UserRole } from '@/types'
import { getPermissions } from '@/types'

interface AuthContextType {
  // Supabase auth state
  user:             User | null
  session:          Session | null
  appUser:          AppUser | null
  permissions:      UserPermissions | null
  isLoading:        boolean
  isDemo:           boolean

  // Auth actions
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  refreshAppUser:   () => Promise<void>

  // Legacy helper methods (kept for UI component backward-compatibility)
  hasAccess:        (channel: string) => boolean
  hasRole:          (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Demo mode fake user ─────────────────────────────────────────

const DEMO_APP_USER: AppUser = {
  id: 'demo-admin-001',
  email: 'admin@workershub.demo',
  display_name: 'Demo Admin',
  role: 'admin',
  platform_access: null,
  worker_id: null,
  can_view_orders: true,
  is_active: true,
  last_sign_in: new Date().toISOString(),
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
}

// ── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = isDemoMode()

  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [appUser,   setAppUser]   = useState<AppUser | null>(demo ? DEMO_APP_USER : null)
  const [isLoading, setIsLoading] = useState(!demo) // demo starts loaded

  // ── Real Supabase auth (skipped in demo) ────────────────────
  const supabase = demo ? null : createClient()

  const loadAppUser = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('app_users').select('*').eq('id', userId).single()
    if (data) setAppUser(data as AppUser)
  }, [supabase])

  useEffect(() => {
    if (demo || !supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadAppUser(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) await loadAppUser(session.user.id)
        else setAppUser(null)
        setIsLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      },
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setAppUser(null)
  }, [supabase])

  const refreshAppUser = useCallback(async () => {
    if (user) await loadAppUser(user.id)
  }, [user, loadAppUser])

  // ── Legacy helpers ──────────────────────────────────────────────

  const hasAccess = useCallback((channel: string): boolean => {
    if (!appUser) return false
    const accessMap: Record<UserRole, string[]> = {
      admin:      ['dashboard', 'tracker', 'registry', 'onboarding', 'orders', 'payroll', 'reports', 'activity', 'audit', 'admin'],
      manager:    ['dashboard', 'tracker', 'registry', 'onboarding', 'payroll', 'reports',
                   ...(appUser.can_view_orders ? ['orders'] : [])],
      supervisor: ['dashboard', 'tracker', 'registry',
                   ...(appUser.can_view_orders ? ['orders'] : [])],
      worker:     ['dashboard'],
    }
    return accessMap[appUser.role as UserRole]?.includes(channel) ?? false
  }, [appUser])

  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!appUser) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(appUser.role as UserRole)
  }, [appUser])

  return (
    <AuthContext.Provider value={{
      user, session, appUser,
      permissions: appUser ? getPermissions(appUser) : null,
      isLoading,
      isDemo: demo,
      signInWithGoogle, signOut, refreshAppUser,
      hasAccess, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
