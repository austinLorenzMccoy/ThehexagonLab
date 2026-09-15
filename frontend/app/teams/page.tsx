'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { fetchMyTeamTracker, fetchMyTeamActivity, fetchTeamCountsByManager } from '@/lib/db'
import type { AppUser, WorkerTrackerRow, TaskStatusHistoryRow, Platform, WarningLevel } from '@/types'
import { UsersRound, Users, ShieldAlert, ListChecks, History, Loader2 } from 'lucide-react'

interface TeamRow extends WorkerTrackerRow {
  platforms?: Pick<Platform, 'slug' | 'label' | 'icon' | 'color_hex'> | null
}

interface TeamActivityEntry extends TaskStatusHistoryRow {
  worker_tracker?: { worker_name: string } | null
}

const WARNING_BADGE: Record<WarningLevel, string> = {
  '🟢 Clear':    'bg-green-500/10 text-green-700 dark:text-green-400',
  '🟡 Minor':    'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  '🔴 Serious':  'bg-red-500/10 text-red-700 dark:text-red-400',
  '⚫ Banned':   'bg-slate-500/10 text-slate-700 dark:text-slate-400',
  '➖ None':     'bg-muted text-muted-foreground',
}

export default function TeamsPage() {
  const { hasRole, isLoading: authLoading } = useAuth()
  const [managers, setManagers] = useState<AppUser[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loadingManagers, setLoadingManagers] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [team, setTeam] = useState<TeamRow[]>([])
  const [activity, setActivity] = useState<TeamActivityEntry[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  const loadManagers = useCallback(async () => {
    setLoadingManagers(true)
    const [usersRes, teamCounts] = await Promise.all([
      fetch('/api/admin/users').then((r) => (r.ok ? r.json() : [])),
      fetchTeamCountsByManager(),
    ])
    const mgrs = ((usersRes ?? []) as AppUser[]).filter((u) => u.role === 'manager')
    setManagers(mgrs)
    setCounts(teamCounts)
    setLoadingManagers(false)
  }, [])

  useEffect(() => { loadManagers() }, [loadManagers])

  const selectManager = useCallback(async (managerId: string) => {
    setSelectedId(managerId)
    setLoadingTeam(true)
    const [t, a] = await Promise.all([
      fetchMyTeamTracker(managerId),
      fetchMyTeamActivity(managerId, 30),
    ])
    setTeam(t as TeamRow[])
    setActivity(a as TeamActivityEntry[])
    setLoadingTeam(false)
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasRole('admin')) {
    return <AccessDenied />
  }

  const selectedManager = managers.find((m) => m.id === selectedId) ?? null
  const issueCount = team.filter(
    (w) => w.warning_level === '🔴 Serious' || w.warning_level === '⚫ Banned'
  ).length
  const inProgressCount = team.reduce(
    (sum, w) => sum + Object.values(w.task_statuses ?? {}).filter((v) => v === '🔄 In Progress').length,
    0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track each manager&apos;s assigned workers and recent activity
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <UsersRound className="h-4 w-4" />
          Managers ({managers.length})
        </h2>

        {loadingManagers ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : managers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
            <p className="text-muted-foreground">No managers on file yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {managers.map((manager) => (
              <button
                key={manager.id}
                onClick={() => selectManager(manager.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedId === manager.id
                    ? 'border-ops/50 bg-ops/5'
                    : 'border-border-subtle bg-card hover:border-ops/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {manager.display_name ?? manager.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">{manager.email}</p>
                  </div>
                  {!manager.is_active && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                      Deactivated
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {counts[manager.id] ?? 0} workers assigned
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedManager && (
        <div className="space-y-6 border-t border-border-subtle pt-6">
          <h2 className="text-lg font-semibold text-foreground">
            {selectedManager.display_name ?? selectedManager.email.split('@')[0]}&apos;s Team
          </h2>

          {loadingTeam ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryCard
                  label="Team Size"
                  value={team.length}
                  icon={<Users className="h-5 w-5" />}
                />
                <SummaryCard
                  label="Serious / Banned"
                  value={issueCount}
                  icon={<ShieldAlert className="h-5 w-5" />}
                  variant={issueCount > 0 ? 'accent' : 'default'}
                />
                <SummaryCard
                  label="Tasks In Progress"
                  value={inProgressCount}
                  icon={<ListChecks className="h-5 w-5" />}
                />
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-4">Roster</h3>
                {team.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
                    <p className="text-muted-foreground">No workers assigned to this manager yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {team.map((worker) => (
                      <div
                        key={worker.id}
                        className="rounded-lg border border-border-subtle bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{worker.worker_name}</p>
                            {worker.owner_name !== worker.worker_name && (
                              <p className="text-xs text-muted-foreground">{worker.owner_name}</p>
                            )}
                          </div>
                          {worker.platforms && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
                              style={{
                                backgroundColor: `${worker.platforms.color_hex}18`,
                                color: worker.platforms.color_hex,
                                borderColor: `${worker.platforms.color_hex}33`,
                              }}
                            >
                              <span aria-hidden>{worker.platforms.icon}</span>
                              {worker.platforms.label}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${WARNING_BADGE[worker.warning_level]}`}
                          >
                            {worker.warning_level}
                          </span>
                        </div>

                        {Object.keys(worker.task_statuses ?? {}).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {Object.entries(worker.task_statuses).map(([key, value]) => (
                              <span
                                key={key}
                                className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                title={key}
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Activity
                </h3>
                {activity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-10">
                    <p className="text-muted-foreground text-sm">No activity recorded for this team yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activity.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-lg border border-border-subtle bg-card p-3 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {entry.worker_tracker?.worker_name ?? 'Unknown'}
                        </span>
                        {' — '}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {entry.column_key}
                        </span>
                        {' changed to '}
                        <span className="text-green-600 dark:text-green-400">{entry.new_value}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(entry.changed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
