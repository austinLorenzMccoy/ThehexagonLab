'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import {
  fetchPlatforms,
  fetchRegistryByPlatform,
  insertRegistryRow,
  updateRegistryRow,
  deleteRegistryRow,
} from '@/lib/db'
import type { Platform, WorkerRegistryRow, AccountType, GeoworkStatus } from '@/types'
import { useToast } from '@/lib/toast-context'
import { Search, UserPlus, Loader2, X, Pencil, Trash2 } from 'lucide-react'

const ACCOUNT_TYPES: AccountType[] = ['Full-Time', 'Part-Time', 'Contractor', 'Intern', 'Freelance']
const GEOWORK_OPTIONS: GeoworkStatus[] = ['✅ Passed', '❌ Failed', '⏳ Pending', '🔄 Retake', '⭕ Exempted']

export default function RegistryPage() {
  const { hasAccess, isLoading: authLoading } = useAuth()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [workers, setWorkers] = useState<WorkerRegistryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRow, setEditingRow] = useState<WorkerRegistryRow | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPlatforms().then((data) => {
      setPlatforms(data)
      if (data.length > 0) setSelectedPlatform(data[0].slug)
      setLoading(false)
    })
  }, [])

  const loadRegistry = useCallback(async (slug: string) => {
    setTableLoading(true)
    const data = await fetchRegistryByPlatform(slug)
    setWorkers(data)
    setTableLoading(false)
  }, [])

  useEffect(() => {
    if (selectedPlatform) loadRegistry(selectedPlatform)
  }, [selectedPlatform, loadRegistry])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }
  if (!hasAccess('registry')) {
    return <AccessDenied />
  }

  const activePlatform = platforms.find((p) => p.slug === selectedPlatform)

  const filteredWorkers = workers.filter(
    (w) =>
      w.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.project_task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!activePlatform) return

    const { id, error } = await insertRegistryRow({
      platform_id: activePlatform.id,
      project_task: fd.get('project_task') as string,
      owner_name: fd.get('owner_name') as string,
      account_type: fd.get('account_type') as AccountType,
      email: (fd.get('email') as string) || null,
      passport: null,
      geowork_test: '⏳ Pending',
      date_started: (fd.get('date_started') as string) || null,
      notes: (fd.get('notes') as string) || null,
    })

    if (!error && id) {
      setShowForm(false)
      loadRegistry(selectedPlatform)
    }
  }

  const handleDelete = async (rowId: string) => {
    if (!window.confirm('Delete this worker record?')) return
    const { error } = await deleteRegistryRow(rowId)
    if (!error) {
      setWorkers((prev) => prev.filter((r) => r.id !== rowId))
      toast('Record deleted', 'success')
    }
  }

  const handleSaveRow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingRow) return
    const fd = new FormData(e.currentTarget)
    const updates: Record<string, unknown> = {
      project_task: (fd.get('project_task') as string) || editingRow.project_task,
      owner_name: (fd.get('owner_name') as string) || editingRow.owner_name,
      account_type: (fd.get('account_type') as string) || editingRow.account_type,
      email: (fd.get('email') as string) || null,
      geowork_test: (fd.get('geowork_test') as string) || editingRow.geowork_test,
      date_started: (fd.get('date_started') as string) || null,
      notes: (fd.get('notes') as string) || null,
    }
    const { error } = await updateRegistryRow(editingRow.id, updates as any)
    if (!error) {
      toast('Updated successfully', 'success')
      setEditingRow(null)
      loadRegistry(selectedPlatform)
    } else {
      toast('Update failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Field Roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Worker registration records across platforms
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Worker'}
        </button>
      </div>

      {/* Add worker form */}
      {showForm && (
        <form
          onSubmit={handleAddWorker}
          className="space-y-4 rounded-lg border border-ops/20 bg-ops/5 p-6"
        >
          <h3 className="font-semibold text-foreground">Register New Worker</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Project/Task *</label>
              <input name="project_task" required className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Owner Name *</label>
              <input name="owner_name" required className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Account Type *</label>
              <select name="account_type" required className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50">
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input name="email" type="email" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date Started</label>
              <input name="date_started" type="date" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
              <input name="notes" className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors">
            Register Worker
          </button>
        </form>
      )}

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelectedPlatform(p.slug)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedPlatform === p.slug
                ? 'text-white'
                : 'border border-border-subtle text-muted-foreground hover:bg-muted'
            }`}
            style={selectedPlatform === p.slug ? { backgroundColor: p.color_hex } : undefined}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, project, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border-subtle bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50 focus:border-ops"
        />
      </div>

      {/* Table */}
      {tableLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
          <p className="text-muted-foreground">
            {searchQuery ? 'No workers match your search' : `No workers registered for ${activePlatform?.label ?? 'this platform'} yet.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-card">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project/Task</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Geowork</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Started</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredWorkers.map((w) => (
                <tr key={w.id} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{w.project_task}</td>
                  <td className="px-4 py-3 text-foreground">{w.owner_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {w.account_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{w.email ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{w.geowork_test}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {w.date_started ? new Date(w.date_started).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {w.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingRow(w)}
                        className="p-1 rounded hover:bg-ops/10 transition-colors"
                        title="Edit entry"
                      >
                        <Pencil className="h-3.5 w-3.5 text-ops" />
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Edit Modal */}
    {editingRow && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-xl border border-border-subtle bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Edit Worker</h2>
            <button onClick={() => setEditingRow(null)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSaveRow} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Project/Task *</label>
                <input name="project_task" required defaultValue={editingRow.project_task} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Owner Name *</label>
                <input name="owner_name" required defaultValue={editingRow.owner_name} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account Type</label>
                <select name="account_type" defaultValue={editingRow.account_type} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50">
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input name="email" type="email" defaultValue={editingRow.email ?? ''} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Geowork Test</label>
                <select name="geowork_test" defaultValue={editingRow.geowork_test} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50">
                  {GEOWORK_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Date Started</label>
                <input name="date_started" type="date" defaultValue={editingRow.date_started ?? ''} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea name="notes" rows={2} defaultValue={editingRow.notes ?? ''} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setEditingRow(null)} className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
