'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { GlobalSearch } from './global-search'
import { LogOut, Settings, X, Sun, Moon, Monitor, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function CommandStrip() {
  const router = useRouter()
  const { appUser, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [showAlerts, setShowAlerts] = useState(false)

  const loadAlerts = useCallback(async () => {
    if (appUser?.role !== 'admin') return
    const supabase = createClient()
    const { data } = await supabase
      .from('alert_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10)
    setAlerts(data ?? [])
  }, [appUser?.role])

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('alert_notifications').update({ is_read: true }).eq('id', id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const markAllRead = async () => {
    const supabase = createClient()
    await supabase.from('alert_notifications').update({ is_read: true }).eq('is_read', false)
    setAlerts([])
  }

  if (!appUser) return null

  const displayName = appUser.display_name ?? appUser.email.split('@')[0]

  const handleSignOut = async () => {
    setLoggingOut(true)
    await signOut()
    router.push('/')
  }

  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      dark: 'light',
      light: 'system',
      system: 'dark',
    }
    setTheme(next[theme])
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <>
      <div className="flex items-center justify-between border-b border-border-subtle bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-signal animate-pulse"></div>
          <span className="text-xs font-medium text-muted-foreground">
            {displayName} • {appUser.role.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <GlobalSearch />

          <button
            onClick={cycleTheme}
            className="rounded p-1.5 hover:bg-muted transition-colors"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Alert bell */}
          {appUser.role === 'admin' && (
            <div className="relative">
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="rounded p-1.5 hover:bg-muted transition-colors relative"
                title="Alerts"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {alerts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </button>

              {showAlerts && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border-subtle bg-card shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">Alerts</span>
                    {alerts.length > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-ops hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-muted-foreground">No unread alerts</p>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => markRead(alert.id)}
                          className={`cursor-pointer border-b border-border-subtle px-3 py-2 hover:bg-muted/50 transition-colors ${
                            alert.severity === 'critical' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-yellow-500'
                          }`}
                        >
                          <p className="text-xs font-medium text-foreground">{alert.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded p-1.5 hover:bg-muted transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleSignOut}
            disabled={loggingOut}
            className="rounded p-1.5 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-border-subtle bg-card/80 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Account Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="rounded p-1 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-background/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
              <p className="mt-1 text-sm font-medium text-foreground truncate">{appUser.email}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Role</p>
              <p className="mt-1 text-sm font-medium text-foreground capitalize">{appUser.role}</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Platforms</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {appUser.platform_access ? appUser.platform_access.join(', ') : 'All platforms'}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-background/50 p-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Theme</p>
              <div className="mt-1 flex gap-1">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                      theme === t
                        ? 'bg-ops text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
