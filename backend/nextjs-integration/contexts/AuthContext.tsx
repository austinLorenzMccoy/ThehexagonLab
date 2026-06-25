'use client'

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AppUser, UserPermissions, UserRole } from '@/types'
import { getPermissions } from '@/types'

interface AuthContextType {
  // Supabase auth state
  user:             User | null
  session:          Session | null
  appUser:          AppUser | null
  permissions:      UserPermissions | null
  isLoading:        boolean

  // Auth actions
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  refreshAppUser:   () => Promise<void>

  // Legacy helper methods (kept for UI component backward-compatibility)
  hasAccess:        (channel: string) => boolean
  hasRole:          (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [appUser,   setAppUser]   = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadAppUser = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('app_users').select('*').eq('id', userId).single()
    if (data) setAppUser(data as AppUser)
  }, [supabase])

  useEffect(() => {
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
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      },
    })
  }, [supabase])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setAppUser(null)
  }, [supabase])

  const refreshAppUser = useCallback(async () => {
    if (user) await loadAppUser(user.id)
  }, [user, loadAppUser])

  // ── Legacy helpers ──────────────────────────────────────────────
  // Preserved so existing page/component code using useAuth() continues to work.

  const hasAccess = useCallback((channel: string): boolean => {
    if (!appUser) return false
    const accessMap: Record<UserRole, string[]> = {
      admin:      ['dashboard', 'tracker', 'registry', 'orders', 'payroll', 'admin'],
      manager:    ['dashboard', 'tracker', 'registry', 'payroll',
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
