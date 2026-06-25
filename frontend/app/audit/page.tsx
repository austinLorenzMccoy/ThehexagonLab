'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { createClient } from '@/lib/supabase/client'
import { Shield, Loader2, Filter } from 'lucide-react'

interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, any>
  created_at: string
  user_email?: string
}

const ACTION_COLORS: Record<string, string> = {
  role_change: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  deactivate_user: 'bg-red-500/10 text-red-600 dark:text-red-400',
  activate_user: 'bg-green-500/10 text-green-600 dark:text-green-400',
  create: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  update: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  delete: 'bg-red-500/10 text-red-600 dark:text-red-400',
  login: 'bg-green-500/10 text-green-600 dark:text-green-400',
  import: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
}

export default function AuditPage() {
  const { hasRole } = useAuth()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)
  const [filterAction, setFilterAction] = useState<string>('')

  useEffect(() => {
    loadAudit()
  }, [limit, filterAction]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadAudit = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('audit_log')
      .select('*, app_users:user_id(email)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filterAction) {
      query = query.eq('action', filterAction)
    }

    const { data, error } = await query

    if (error) {
      console.error('Audit log error:', error.message)
      setEntries([])
    } else {
      setEntries(
        (data ?? []).map((d: any) => ({
          ...d,
          user_email: d.app_users?.email ?? 'System',
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
          <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full trail of admin actions, logins, and system events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-border-subtle bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
          >
            <option value="">All Actions</option>
            <option value="role_change">Role Changes</option>
            <option value="deactivate_user">Deactivations</option>
            <option value="activate_user">Activations</option>
            <option value="create">Creates</option>
            <option value="update">Updates</option>
            <option value="delete">Deletes</option>
            <option value="login">Logins</option>
            <option value="import">Imports</option>
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-border-subtle bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-16">
          <Shield className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No audit entries recorded yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Admin actions will be logged here automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-card">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {entries.map((entry) => {
                const colorClass = ACTION_COLORS[entry.action] ?? 'bg-gray-500/10 text-gray-500'
                return (
                  <tr key={entry.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground">{entry.user_email}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                        {entry.entity_type}
                      </span>
                      {entry.entity_id && (
                        <span className="ml-1 text-muted-foreground">#{entry.entity_id.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                      {Object.entries(entry.details || {}).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {k}: <strong className="text-foreground">{String(v)}</strong>
                        </span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {entries.length >= limit && (
        <button
          onClick={() => setLimit(limit + 50)}
          className="w-full rounded-lg border border-border-subtle bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}
