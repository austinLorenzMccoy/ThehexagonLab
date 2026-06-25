'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { createClient } from '@/lib/supabase/client'
import { History, Loader2, Filter } from 'lucide-react'

interface ActivityEntry {
  id: string
  tracker_row_id: string
  column_key: string
  old_value: string | null
  new_value: string
  changed_by: string | null
  changed_at: string
  worker_name?: string
  changer_email?: string
}

export default function ActivityPage() {
  const { hasRole } = useAuth()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    loadActivity()
  }, [limit]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadActivity = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_status_history')
      .select(`
        id, tracker_row_id, column_key, old_value, new_value,
        changed_by, changed_at,
        worker_tracker(worker_name),
        app_users:changed_by(email)
      `)
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Activity log error:', error.message)
      setEntries([])
    } else {
      setEntries(
        (data ?? []).map((d: any) => ({
          ...d,
          worker_name: d.worker_tracker?.worker_name ?? 'Unknown',
          changer_email: d.app_users?.email ?? 'System',
        }))
      )
    }
    setLoading(false)
  }

  if (!hasRole('admin')) {
    return <AccessDenied />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all field changes across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-16">
          <History className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No activity recorded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Changes made to worker tracker fields will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const date = new Date(entry.changed_at)
            const timeAgo = getTimeAgo(date)

            return (
              <div
                key={entry.id}
                className="rounded-lg border border-border-subtle bg-card p-4 hover:border-ops/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-ops flex-shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{entry.changer_email}</span>
                        {' changed '}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.column_key}
                        </span>
                        {' on '}
                        <span className="font-medium">{entry.worker_name}</span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs">
                        {entry.old_value && (
                          <>
                            <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-600 dark:text-red-400 line-through">
                              {entry.old_value}
                            </span>
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <span className="rounded bg-green-500/10 px-2 py-0.5 text-green-600 dark:text-green-400">
                          {entry.new_value}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-4" title={date.toLocaleString()}>
                    {timeAgo}
                  </span>
                </div>
              </div>
            )
          })}

          {entries.length >= limit && (
            <button
              onClick={() => setLimit(limit + 50)}
              className="w-full rounded-lg border border-border-subtle bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
