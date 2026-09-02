'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { fetchAllFeedback } from '@/lib/db'
import type { WorkerFeedbackRow, FeedbackCategory } from '@/types'
import { Loader2, MessageSquare } from 'lucide-react'

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  manager: 'About a manager',
  process: 'Work process',
  platform: 'Platform',
  other: 'Other',
}

/** Admin-only inbox. Per the PRD, managers must never see feedback —
 *  this route is gated both by `hasAccess('feedback')` (admin-only in
 *  auth-context) and by middleware's ADMIN_ONLY list, and the
 *  `worker_feedback` table has no select policy for managers at all. */
export default function FeedbackPage() {
  const { hasAccess } = useAuth()
  const [feedback, setFeedback] = useState<WorkerFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FeedbackCategory | null>(null)

  useEffect(() => {
    fetchAllFeedback().then((data) => { setFeedback(data); setLoading(false) })
  }, [])

  if (!hasAccess('feedback')) return <AccessDenied />

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered = filter ? feedback.filter((f) => f.category === filter) : feedback

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Worker Feedback</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin-only inbox — managers cannot see this, even feedback about themselves
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filter === null ? 'bg-ops text-white' : 'border border-border-subtle text-muted-foreground hover:bg-muted'
          }`}
        >
          All ({feedback.length})
        </button>
        {(Object.keys(CATEGORY_LABEL) as FeedbackCategory[]).map((c) => {
          const count = feedback.filter((f) => f.category === c).length
          if (count === 0) return null
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === c ? 'bg-ops text-white' : 'border border-border-subtle text-muted-foreground hover:bg-muted'
              }`}
            >
              {CATEGORY_LABEL[c]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-16">
          <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No feedback submitted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div key={f.id} className="rounded-lg border border-border-subtle bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{f.subject}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {CATEGORY_LABEL[f.category]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{f.message}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
