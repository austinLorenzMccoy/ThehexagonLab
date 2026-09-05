'use client'

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { setDemoPreviewActive } from '@/lib/demo'
import type { AppUser, UserPermissions, UserRole } from '@/types'
import { getPermissions } from '@/types'

interface AuthContextType {
  // Supabase auth state
  user:             User | null
  session:          Session | null
  appUser:          AppUser | null
  permissions:      UserPermissions | null
  isLoading:        boolean

  // Demo preview — only ever available to a real, signed-in admin
  canPreviewDemo:   boolean
  isPreviewingDemo: boolean
  toggleDemoPreview: () => void

  // Auth actions
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  refreshAppUser:   () => Promise<void>

  // Legacy helper methods (kept for UI component backward-compatibility)
  hasAccess:        (channel: string) => boolean
  hasRole:          (role: UserRole | UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// sessionStorage (not a cookie — never read pre-auth, never bypasses sign-in)
// so the toggle survives the full-page reload that forces every page's data
// fetch to re-run under the new isDemoMode() state. Without the reload,
// the identity swaps instantly (appUser is reactive) but each page's fetch
// effect only runs once on mount, so the numbers on screen never actually
// change to sample data.
const DEMO_PREVIEW_KEY = 'wh_demo_preview'

// ── Demo preview fake identity ───────────────────────────────────
// Shown only when a real, signed-in admin opts in via toggleDemoPreview()
// (Account Settings panel). Because Supabase is genuinely connected at
// that point, pages that scope queries to the viewer's own id
// (worker/referrer dashboards, My Team) render this account's real empty
// state; org-wide admin pages are unaffected, since they aren't filtered
// by viewer id.

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
  const [user,      setUser]      = useState<User | null>(null)
  const [session,   setSession]   = useState<Session | null>(null)
  const [realAppUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreviewingDemo, setIsPreviewingDemo] = useState(false)

  const canPreviewDemo = realAppUser?.role === 'admin'
  const appUser = isPreviewingDemo && canPreviewDemo ? DEMO_APP_USER : realAppUser

  // Set synchronously during render, not from a useEffect: effects run
  // children-before-parents within a commit, so a page that mounts in the
  // same commit where canPreviewDemo first becomes true (its own data-fetch
  // effect firing as a child) would read the module flag before this
  // provider's effect had a chance to flip it, and silently fetch real data.
  // Render always finishes — for every component, this component included —
  // before any effects run, so setting it here can never lose that race.
  setDemoPreviewActive(isPreviewingDemo && canPreviewDemo)

  // Deferred to an effect (not the useState initializer) so server and
  // client agree on the first render — reading sessionStorage during the
  // initializer would make the client's first render diverge from the
  // server's and trip a hydration mismatch.
  useEffect(() => {
    if (sessionStorage.getItem(DEMO_PREVIEW_KEY) === '1') setIsPreviewingDemo(true)
  }, [])

  const toggleDemoPreview = useCallback(() => {
    if (!canPreviewDemo) return
    const next = !isPreviewingDemo
    if (next) sessionStorage.setItem(DEMO_PREVIEW_KEY, '1')
    else sessionStorage.removeItem(DEMO_PREVIEW_KEY)
    // Full reload, not setIsPreviewingDemo — every page's data-fetch effect
    // only runs on mount, so a plain state flip would swap the identity
    // badge instantly but leave already-fetched real numbers on screen.
    window.location.reload()
  }, [canPreviewDemo, isPreviewingDemo])

  // ── Real Supabase auth — always runs; demo never bypasses sign-in ──
  const supabase = createClient()

  const loadAppUser = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data } = await supabase
      .from('app_users').select('*').eq('id', userId).single()
    if (data) setAppUser(data as AppUser)
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
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
    setIsPreviewingDemo(false)
    sessionStorage.removeItem(DEMO_PREVIEW_KEY)
  }, [supabase])

  const refreshAppUser = useCallback(async () => {
    if (user) await loadAppUser(user.id)
  }, [user, loadAppUser])

  // ── Legacy helpers ──────────────────────────────────────────────

  const hasAccess = useCallback((channel: string): boolean => {
    if (!appUser) return false
    const accessMap: Record<UserRole, string[]> = {
      admin:      ['dashboard', 'tracker', 'registry', 'onboarding', 'orders', 'payroll', 'reports', 'activity', 'audit', 'admin',
                   'warnings', 'disputes', 'feedback', 'referrals', 'partners', 'pay-slips'],
      // Managers manage Pay Slips (issue + settle month-end payment)
      // instead of Warnings & Disputes, which are admin-only.
      manager:    ['dashboard', 'my-team', 'tracker', 'registry', 'onboarding', 'payroll', 'reports',
                   'partners', 'pay-slips',
                   ...(appUser.can_view_orders ? ['orders'] : [])],
      supervisor: ['dashboard', 'tracker', 'registry',
                   ...(appUser.can_view_orders ? ['orders'] : [])],
      // Worker Recovery System — self-service portal only (own profile,
      // timesheets, pay slips, warnings, feedback, disputes).
      worker:     ['dashboard'],
      // Worker Recovery System — referral portal only.
      referrer:   ['dashboard'],
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
      canPreviewDemo, isPreviewingDemo, toggleDemoPreview,
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
