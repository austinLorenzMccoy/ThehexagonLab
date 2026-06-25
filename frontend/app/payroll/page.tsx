'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { fetchPlatforms, fetchPayrollByPlatform, upsertPayrollRow, updatePayrollRow, deletePayrollRow } from '@/lib/db'
import type { Platform, PayrollRow } from '@/types'
import { useToast } from '@/lib/toast-context'
import { Download, Loader2, Plus, X, Pencil, Trash2 } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EMPTY_FORM = {
  worker_name: '',
  account_code: '',
  month: MONTHS[new Date().getMonth()],
  year: new Date().getFullYear(),
  tasks_done: 0,
  pay_usd: 0,
  notes: '',
}

export default function PayrollPage() {
  const { hasAccess, hasRole, isLoading: authLoading } = useAuth()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [entries, setEntries] = useState<PayrollRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Edit modal
  const [editingRow, setEditingRow] = useState<PayrollRow | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPlatforms().then((data) => {
      setPlatforms(data)
      if (data.length > 0) setSelectedPlatform(data[0].slug)
      setLoading(false)
    })
  }, [])

  const loadPayroll = useCallback(async (slug: string, year?: number, month?: string) => {
    setTableLoading(true)
    const data = await fetchPayrollByPlatform(slug, year, month || undefined)
    setEntries(data)
    setTableLoading(false)
  }, [])

  useEffect(() => {
    if (selectedPlatform) loadPayroll(selectedPlatform, selectedYear, selectedMonth)
  }, [selectedPlatform, selectedYear, selectedMonth, loadPayroll])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }
  if (!hasAccess('payroll')) {
    return <AccessDenied />
  }

  const activePlatform = platforms.find((p) => p.slug === selectedPlatform)
  const canEdit = hasRole(['admin', 'manager'])

  const totals = entries.reduce(
    (acc, entry) => ({
      tasks: acc.tasks + entry.tasks_done,
      pay: acc.pay + Number(entry.pay_usd),
    }),
    { tasks: 0, pay: 0 }
  )

  const handleExport = () => {
    window.open(`/api/export/payroll?platform=${selectedPlatform}`, '_blank')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.worker_name.trim()) { setFormError('Worker name is required'); return }
    if (!form.account_code.trim()) { setFormError('Account code is required'); return }
    if (form.pay_usd < 0) { setFormError('Pay cannot be negative'); return }

    if (!activePlatform) { setFormError('Select a platform first'); return }

    setSaving(true)
    const { error } = await upsertPayrollRow({
      platform_id: activePlatform.id,
      worker_name: form.worker_name.trim(),
      account_code: form.account_code.trim(),
      month: form.month,
      year: form.year,
      tasks_done: form.tasks_done,
      pay_usd: form.pay_usd,
      notes: form.notes.trim() || null,
    })
    setSaving(false)

    if (error) {
      setFormError(error)
    } else {
      setFormSuccess('Payroll record saved successfully!')
      setForm(EMPTY_FORM)
      loadPayroll(selectedPlatform, selectedYear, selectedMonth)
      setTimeout(() => {
        setFormSuccess('')
        setShowForm(false)
      }, 1500)
    }
  }

  const handleDelete = async (rowId: string) => {
    if (!window.confirm('Delete this payroll record?')) return
    const { error } = await deletePayrollRow(rowId)
    if (!error) {
      setEntries((prev) => prev.filter((r) => r.id !== rowId))
      toast('Record deleted', 'success')
    }
  }

  const handleSaveRow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingRow) return
    const fd = new FormData(e.currentTarget)
    const updates: Record<string, unknown> = {
      worker_name: (fd.get('worker_name') as string) || editingRow.worker_name,
      account_code: (fd.get('account_code') as string) || editingRow.account_code,
      month: (fd.get('month') as string) || editingRow.month,
      year: Number(fd.get('year')) || editingRow.year,
      tasks_done: Number(fd.get('tasks_done')) || 0,
      pay_usd: Number(fd.get('pay_usd')) || 0,
      notes: (fd.get('notes') as string) || null,
    }
    const { error } = await updatePayrollRow(editingRow.id, updates as any)
    if (!error) {
      toast('Updated successfully', 'success')
      setEditingRow(null)
      loadPayroll(selectedPlatform, selectedYear, selectedMonth)
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
          <h1 className="text-3xl font-bold text-foreground">Ledger Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Worker payroll tracking and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess('') }}
              className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'Add Record'}
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border-subtle bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Create Form ──────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-foreground">
            New Payroll Record — {activePlatform?.icon} {activePlatform?.label}
          </h3>

          {formError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{formError}</p>
            </div>
          )}
          {formSuccess && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <p className="text-sm text-green-400">{formSuccess}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Worker Name *
              </label>
              <input
                type="text"
                value={form.worker_name}
                onChange={(e) => setForm({ ...form, worker_name: e.target.value })}
                placeholder="e.g. Alex Chen"
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Account Code *
              </label>
              <input
                type="text"
                value={form.account_code}
                onChange={(e) => setForm({ ...form, account_code: e.target.value })}
                placeholder="e.g. ACC-001"
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Month
              </label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Year
              </label>
              <select
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                {Array.from({ length: 6 }, (_, i) => 2025 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Tasks Done
              </label>
              <input
                type="number"
                min={0}
                value={form.tasks_done}
                onChange={(e) => setForm({ ...form, tasks_done: Number(e.target.value) })}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Pay (USD)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.pay_usd}
                onChange={(e) => setForm({ ...form, pay_usd: Number(e.target.value) })}
                className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? 'Saving…' : 'Save Payroll Record'}
            </button>
          </div>
        </form>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Records
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{entries.length}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Tasks Done
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">{totals.tasks.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border-subtle bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Pay (USD)
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
            ${totals.pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

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

      {/* Year & Month filters */}
      <div className="flex gap-3">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
        >
          {Array.from({ length: 6 }, (_, i) => 2025 + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50"
        >
          <option value="">All Months</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {tableLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-12">
          <p className="text-muted-foreground">
            No payroll records for {activePlatform?.label ?? 'this platform'}{selectedMonth ? ` in ${selectedMonth}` : ''} {selectedYear}.
          </p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add First Record
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-card">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Worker</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tasks Done</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pay (USD)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {entries.map((entry) => (
                <tr key={entry.id} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{entry.worker_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{entry.account_code}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{entry.month} {entry.year}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">{entry.tasks_done}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                    ${Number(entry.pay_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                    {entry.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingRow(entry)}
                          className="p-1 rounded hover:bg-ops/10 transition-colors"
                          title="Edit entry"
                        >
                          <Pencil className="h-3.5 w-3.5 text-ops" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 rounded hover:bg-red-500/10 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    )}
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
            <h2 className="text-lg font-semibold text-foreground">Edit Payroll Record</h2>
            <button onClick={() => setEditingRow(null)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <form onSubmit={handleSaveRow} className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Worker Name *</label>
                <input name="worker_name" required defaultValue={editingRow.worker_name} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Account Code *</label>
                <input name="account_code" required defaultValue={editingRow.account_code} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
                <select name="month" defaultValue={editingRow.month} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50">
                  {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
                <select name="year" defaultValue={editingRow.year} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50">
                  {Array.from({ length: 6 }, (_, i) => 2025 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tasks Done</label>
                <input name="tasks_done" type="number" min={0} defaultValue={editingRow.tasks_done} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Pay (USD)</label>
                <input name="pay_usd" type="number" min={0} step={0.01} defaultValue={editingRow.pay_usd} className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/50" />
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
