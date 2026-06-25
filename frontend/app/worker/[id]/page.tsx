'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, User } from 'lucide-react'
import Link from 'next/link'

interface WorkerData {
  tracker: any[]
  registry: any[]
  orders: any[]
  payroll: any[]
  onboarding: any[]
  history: any[]
}

export default function WorkerProfilePage() {
  const params = useParams()
  const workerId = params.id as string
  const { hasAccess } = useAuth()
  const [data, setData] = useState<WorkerData | null>(null)
  const [workerName, setWorkerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWorkerData()
  }, [workerId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkerData = async () => {
    setLoading(true)
    const supabase = createClient()

    // Get worker name from tracker
    const { data: trackerRow } = await supabase
      .from('worker_tracker')
      .select('id, worker_name, owner_name, email, platform_id, warning_level, platforms(label, icon, color_hex)')
      .eq('id', workerId)
      .single()

    if (trackerRow) {
      setWorkerName((trackerRow as any).worker_name)
    }

    // Parallel fetch all related data
    const [tracker, registry, payroll, history] = await Promise.all([
      supabase.from('worker_tracker').select('*, platforms(label, icon, color_hex)').eq('id', workerId),
      supabase.from('workers_registry').select('*, platforms(label, icon)').eq('owner_name', (trackerRow as any)?.owner_name ?? ''),
      supabase.from('payroll').select('*, platforms(label, icon)').eq('worker_name', (trackerRow as any)?.worker_name ?? '').order('year', { ascending: false }).order('month'),
      supabase.from('task_status_history').select('*').eq('tracker_row_id', workerId).order('changed_at', { ascending: false }).limit(20),
    ])

    setData({
      tracker: tracker.data ?? [],
      registry: registry.data ?? [],
      orders: [],
      payroll: payroll.data ?? [],
      onboarding: [],
      history: history.data ?? [],
    })
    setLoading(false)
  }

  if (!hasAccess('tracker')) {
    return <AccessDenied />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const worker = data?.tracker[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tracker" className="rounded p-1.5 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{workerName || 'Worker Profile'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cross-platform history and status overview
          </p>
        </div>
      </div>

      {/* Worker info card */}
      {worker && (
        <div className="rounded-lg border border-border-subtle bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ops/10">
              <User className="h-7 w-7 text-ops" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{worker.worker_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="font-medium text-foreground">{worker.owner_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{worker.email ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm text-foreground">
                  {(worker.platforms as any)?.icon} {(worker.platforms as any)?.label}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Warning Level</p>
                <p className="text-sm">{worker.warning_level}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payroll history */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            💰 Payroll History ({data?.payroll.length ?? 0})
          </h2>
          {data?.payroll.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No payroll records</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.payroll.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-2">
                  <div>
                    <span className="text-xs">{(p.platforms as any)?.icon}</span>
                    <span className="text-sm font-medium text-foreground ml-1">{p.month} {p.year}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                      ${Number(p.pay_usd).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{p.tasks_done} tasks</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status change history */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            📋 Status Changes ({data?.history.length ?? 0})
          </h2>
          {data?.history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No status changes recorded</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.history.map((h: any) => (
                <div key={h.id} className="rounded bg-background/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{h.column_key}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(h.changed_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    {h.old_value && (
                      <>
                        <span className="text-red-500 line-through">{h.old_value}</span>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <span className="text-green-500">{h.new_value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registry records */}
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            📂 Registry Records ({data?.registry.length ?? 0})
          </h2>
          {data?.registry.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No registry records</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data?.registry.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded bg-background/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.project_task}</p>
                    <p className="text-xs text-muted-foreground">{r.account_type}</p>
                  </div>
                  <span className="text-sm">{r.geowork_test}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
