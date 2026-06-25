'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  type: 'worker' | 'order' | 'onboarding' | 'payroll'
  title: string
  subtitle: string
  href: string
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    const supabase = createClient()
    const term = `%${q}%`

    const [workers, orders, onboarding, payroll] = await Promise.all([
      supabase.from('worker_tracker').select('id, worker_name, owner_name, email').ilike('worker_name', term).limit(5),
      supabase.from('orders').select('id, order_id_code, owner_name, status').ilike('order_id_code', term).limit(5),
      supabase.from('onboarding').select('id, applicant_name, email, country').ilike('applicant_name', term).limit(5),
      supabase.from('payroll').select('id, worker_name, account_code, month, year').ilike('worker_name', term).limit(5),
    ])

    const items: SearchResult[] = [
      ...(workers.data ?? []).map((w: any) => ({
        type: 'worker' as const,
        title: w.worker_name,
        subtitle: `Owner: ${w.owner_name}${w.email ? ` • ${w.email}` : ''}`,
        href: '/tracker',
      })),
      ...(orders.data ?? []).map((o: any) => ({
        type: 'order' as const,
        title: o.order_id_code,
        subtitle: `${o.owner_name} • ${o.status}`,
        href: '/orders',
      })),
      ...(onboarding.data ?? []).map((a: any) => ({
        type: 'onboarding' as const,
        title: a.applicant_name,
        subtitle: `${a.country ?? 'Unknown country'}${a.email ? ` • ${a.email}` : ''}`,
        href: '/onboarding',
      })),
      ...(payroll.data ?? []).map((p: any) => ({
        type: 'payroll' as const,
        title: p.worker_name,
        subtitle: `${p.account_code} • ${p.month} ${p.year}`,
        href: '/payroll',
      })),
    ]

    setResults(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const selectResult = (result: SearchResult) => {
    router.push(result.href)
    setOpen(false)
    setQuery('')
  }

  const typeLabel: Record<string, string> = {
    worker: '👤 Worker',
    order: '📦 Order',
    onboarding: '📋 Application',
    payroll: '💰 Payroll',
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-2 rounded-lg border border-border-subtle bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border-subtle bg-muted px-1.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm">
      <div ref={containerRef} className="w-full max-w-lg mx-4 rounded-xl border border-border-subtle bg-card shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workers, orders, applications..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <button onClick={() => { setOpen(false); setQuery('') }} className="p-1 rounded hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, i) => (
                <button
                  key={`${result.type}-${i}`}
                  onClick={() => selectResult(result)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <span className="text-xs font-medium text-muted-foreground w-24 flex-shrink-0">
                    {typeLabel[result.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-4 py-2 flex gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  )
}
