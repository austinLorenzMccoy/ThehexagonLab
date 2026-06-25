'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CommandStrip } from './command-strip'
import { SignalNav } from './signal-nav'
import { PanelLeftClose, PanelLeft, Hexagon } from 'lucide-react'
import { cn } from '@/lib/utils'

const SHELL_BYPASS = ['/', '/login']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Persist sidebar state across page navigations
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  // Landing page and login page render without the app shell
  if (!user || SHELL_BYPASS.includes(pathname)) {
    return children
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <CommandStrip />
      <div className="flex flex-1 overflow-hidden">
        {/* ── Collapsible Sidebar ─────────────────────── */}
        <aside
          className={cn(
            'relative flex flex-col border-r border-white/[0.06] bg-[#0a0a0a] transition-all duration-300 ease-in-out',
            collapsed ? 'w-[68px]' : 'w-56'
          )}
        >
          {/* Logo area */}
          <div
            className={cn(
              'flex items-center border-b border-white/[0.06] px-4 py-3',
              collapsed ? 'justify-center px-2' : 'gap-3'
            )}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white">
              <Hexagon className="h-4 w-4 text-black" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white leading-none">
                  Hexagon LABS
                </h1>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Intelligence Control Room
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <SignalNav collapsed={collapsed} />
          </div>

          {/* Collapse toggle button */}
          <div className="border-t border-white/[0.06] p-2">
            <button
              onClick={toggleCollapsed}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/40 transition-all duration-200 hover:bg-white/10 hover:text-white/70',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4 flex-shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────── */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
