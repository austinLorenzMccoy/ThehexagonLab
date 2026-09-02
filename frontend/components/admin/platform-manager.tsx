'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Platform, PlatformTaskColumn } from '@/types'
import {
  PLATFORM_COLOR_PRESETS,
  PLATFORM_ICON_PRESETS,
  emptyUsage,
  hasOperationalData,
  slugifyPlatformLabel,
  type PlatformUsage,
} from '@/lib/platform-utils'
import { RevenueSplitPanel } from '@/components/admin/revenue-split-panel'
import {
  Loader2,
  Plus,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Copy,
  Power,
  Trash2,
  GripVertical,
  Columns3,
} from 'lucide-react'

interface PlatformWithUsage extends Platform {
  usage?: PlatformUsage
}

type Message = { type: 'success' | 'error'; text: string }

export function PlatformManager({ onPlatformsChanged }: { onPlatformsChanged?: () => void }) {
  const [platforms, setPlatforms] = useState<PlatformWithUsage[]>([])
  const [usageMap, setUsageMap] = useState<Record<number, PlatformUsage>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Create form
  const [newLabel, setNewLabel] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [newIcon, setNewIcon] = useState<string>(PLATFORM_ICON_PRESETS[0])
  const [newColor, setNewColor] = useState<string>(PLATFORM_COLOR_PRESETS[0])
  const [cloneFrom, setCloneFrom] = useState<string>('')
  const [seedColumns, setSeedColumns] = useState('')

  // Edit form
  const [editLabel, setEditLabel] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editSlug, setEditSlug] = useState('')

  // Columns
  const [columns, setColumns] = useState<PlatformTaskColumn[]>([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [newColLabel, setNewColLabel] = useState('')
  const [editingColId, setEditingColId] = useState<number | null>(null)
  const [editColLabel, setEditColLabel] = useState('')

  const loadPlatforms = useCallback(async () => {
    const res = await fetch('/api/admin/platforms')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ type: 'error', text: data.error || 'Failed to load platforms' })
      return
    }
    const data = await res.json()
    setPlatforms(data.platforms ?? [])
    setUsageMap(data.usage ?? {})
    onPlatformsChanged?.()
  }, [onPlatformsChanged])

  useEffect(() => {
    loadPlatforms().finally(() => setLoading(false))
  }, [loadPlatforms])

  const loadColumns = useCallback(async (platformId: number) => {
    setColumnsLoading(true)
    const res = await fetch(`/api/admin/platforms/columns?platform_id=${platformId}`)
    if (res.ok) {
      const data = await res.json()
      setColumns(data.columns ?? [])
    } else {
      setColumns([])
    }
    setColumnsLoading(false)
  }, [])

  useEffect(() => {
    if (expandedId != null) loadColumns(expandedId)
  }, [expandedId, loadColumns])

  useEffect(() => {
    if (!slugTouched) {
      setNewSlug(slugifyPlatformLabel(newLabel))
    }
  }, [newLabel, slugTouched])

  const activeCount = useMemo(
    () => platforms.filter((p) => p.is_active).length,
    [platforms]
  )

  const flash = (type: Message['type'], text: string) => {
    setMessage({ type, text })
  }

  const resetCreate = () => {
    setNewLabel('')
    setNewSlug('')
    setSlugTouched(false)
    setNewIcon(PLATFORM_ICON_PRESETS[0])
    setNewColor(PLATFORM_COLOR_PRESETS[0])
    setCloneFrom('')
    setSeedColumns('')
    setShowCreate(false)
  }

  const createPlatform = async () => {
    if (!newLabel.trim()) {
      flash('error', 'Platform name is required')
      return
    }
    setSaving(true)
    setMessage(null)

    const task_columns = seedColumns
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ column_label: label, column_key: label }))

    const res = await fetch('/api/admin/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newLabel.trim(),
        slug: newSlug.trim() || undefined,
        icon: newIcon,
        color_hex: newColor,
        clone_from_platform_id: cloneFrom ? Number(cloneFrom) : null,
        task_columns: cloneFrom ? [] : task_columns,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      flash('error', data.error || 'Failed to create platform')
      return
    }

    flash(
      'success',
      `Platform "${data.platform.label}" created` +
        (data.columns_inserted ? ` with ${data.columns_inserted} task columns` : '')
    )
    resetCreate()
    await loadPlatforms()
  }

  const startEdit = (p: Platform) => {
    setEditingId(p.id)
    setEditLabel(p.label)
    setEditIcon(p.icon)
    setEditColor(p.color_hex)
    setEditSlug(p.slug)
    setMessage(null)
  }

  const saveEdit = async (id: number) => {
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/admin/platforms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        label: editLabel,
        icon: editIcon,
        color_hex: editColor,
        slug: editSlug,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Failed to update platform')
      return
    }
    flash('success', 'Platform updated')
    setEditingId(null)
    await loadPlatforms()
  }

  const toggleActive = async (p: Platform) => {
    const next = !p.is_active
    const confirmed = window.confirm(
      next
        ? `Reactivate "${p.label}"? It will show up in Tracker, Registry, Orders, etc.`
        : `Deactivate "${p.label}"? It will hide from operational screens but keep historical data.`
    )
    if (!confirmed) return

    setSaving(true)
    const res = await fetch('/api/admin/platforms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, is_active: next }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Failed to update status')
      return
    }
    flash('success', next ? 'Platform reactivated' : 'Platform deactivated')
    await loadPlatforms()
  }

  const deletePlatform = async (p: Platform) => {
    const usage = usageMap[p.id] ?? emptyUsage()
    const hasData = hasOperationalData(usage)

    if (hasData) {
      const soft = window.confirm(
        `"${p.label}" has existing data (tracker/registry/orders/etc). It can only be deactivated, not permanently deleted. Deactivate now?`
      )
      if (!soft) return
      setSaving(true)
      const res = await fetch('/api/admin/platforms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, hard: false }),
      })
      const data = await res.json()
      setSaving(false)
      if (!res.ok) {
        flash('error', data.error || 'Failed to deactivate')
        return
      }
      flash('success', 'Platform deactivated')
      await loadPlatforms()
      return
    }

    const hard = window.confirm(
      `Permanently delete "${p.label}"? This removes the platform and its task columns. This cannot be undone.`
    )
    if (!hard) return

    setSaving(true)
    const res = await fetch('/api/admin/platforms', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, hard: true }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Failed to delete platform')
      return
    }
    flash('success', 'Platform permanently deleted')
    if (expandedId === p.id) setExpandedId(null)
    await loadPlatforms()
  }

  const addColumn = async (platformId: number) => {
    if (!newColLabel.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform_id: platformId,
        column_label: newColLabel.trim(),
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Failed to add column')
      return
    }
    setNewColLabel('')
    flash('success', 'Task column added')
    await loadColumns(platformId)
    await loadPlatforms()
  }

  const saveColumn = async (colId: number, platformId: number) => {
    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: colId, column_label: editColLabel }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Failed to update column')
      return
    }
    setEditingColId(null)
    flash('success', 'Column updated')
    await loadColumns(platformId)
  }

  const toggleColumnActive = async (col: PlatformTaskColumn) => {
    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: col.id, is_active: !col.is_active }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      flash('error', data.error || 'Failed to update column')
      return
    }
    if (expandedId) await loadColumns(expandedId)
    await loadPlatforms()
  }

  const removeColumn = async (col: PlatformTaskColumn) => {
    const hard = !col.is_active
      ? window.confirm(`Permanently delete column "${col.column_label}"? Historical tracker keys stay in JSON but the column definition is removed.`)
      : false

    if (!hard && col.is_active) {
      const soft = window.confirm(
        `Deactivate column "${col.column_label}"? It will hide from the Tracker grid.`
      )
      if (!soft) return
    } else if (!hard) {
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: col.id, hard }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      flash('error', data.error || 'Failed to remove column')
      return
    }
    flash('success', hard ? 'Column deleted' : 'Column deactivated')
    if (expandedId) await loadColumns(expandedId)
    await loadPlatforms()
  }

  const moveColumn = async (platformId: number, index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= columns.length) return
    const ordered = [...columns]
    const [item] = ordered.splice(index, 1)
    ordered.splice(next, 0, item)
    setColumns(ordered)

    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        platform_id: platformId,
        ordered_ids: ordered.map((c) => c.id),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      flash('error', data.error || 'Failed to reorder')
      await loadColumns(platformId)
    }
  }

  const cloneColumnsInto = async (targetId: number, sourceId: number) => {
    setSaving(true)
    const res = await fetch('/api/admin/platforms/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clone',
        source_platform_id: sourceId,
        target_platform_id: targetId,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      flash('error', data.error || 'Clone failed')
      return
    }
    flash('success', `Cloned ${data.inserted ?? 0} column(s)`)
    await loadColumns(targetId)
    await loadPlatforms()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-ops" />
            <h2 className="text-lg font-semibold text-foreground">
              Platforms ({platforms.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add new AI training platforms, tune branding, and manage per-platform tracker columns — no code deploy needed.
            {' '}{activeCount} active.
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate((v) => !v)
            setMessage(null)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-ops px-3 py-2 text-xs font-medium text-white hover:bg-ops-dark transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Platform
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-ops/30 bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">New Platform</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Name *</span>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. TryRating Maps"
                className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/40"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Slug (auto)</span>
              <input
                value={newSlug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                }}
                placeholder="tryrating_maps"
                className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ops/40"
              />
            </label>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Icon</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_ICON_PRESETS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`h-9 w-9 rounded-md text-lg transition-colors ${
                    newIcon === icon
                      ? 'bg-ops/15 ring-2 ring-ops'
                      : 'border border-border-subtle hover:bg-muted'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Color</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {PLATFORM_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    newColor === c ? 'ring-2 ring-offset-2 ring-ops scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border-subtle bg-transparent"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Copy className="h-3 w-3" /> Clone task columns from
              </span>
              <select
                value={cloneFrom}
                onChange={(e) => setCloneFrom(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/40"
              >
                <option value="">— None —</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>
            </label>

            {!cloneFrom && (
              <label className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Or seed columns (comma / newline)
                </span>
                <textarea
                  value={seedColumns}
                  onChange={(e) => setSeedColumns(e.target.value)}
                  placeholder="PR, GEOWORK TEST, KYC VERIFY"
                  rows={2}
                  className="w-full rounded-md border border-border-subtle bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ops/40"
                />
              </label>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: newColor }}
            >
              {newIcon} {newLabel || 'Preview'}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{newSlug || 'slug'}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createPlatform}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-ops px-3 py-1.5 text-xs font-medium text-white hover:bg-ops-dark disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Create Platform
            </button>
            <button
              onClick={resetCreate}
              className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Platform list */}
      <div className="space-y-3">
        {platforms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-subtle bg-card py-10 text-center text-sm text-muted-foreground">
            No platforms yet. Add your first AI training platform above.
          </div>
        ) : (
          platforms.map((p) => {
            const usage = usageMap[p.id] ?? emptyUsage()
            const isExpanded = expandedId === p.id
            const isEditing = editingId === p.id

            return (
              <div
                key={p.id}
                className={`rounded-lg border bg-card transition-colors ${
                  !p.is_active
                    ? 'border-border-subtle opacity-70'
                    : isExpanded
                      ? 'border-ops/40'
                      : 'border-border-subtle hover:border-ops/25'
                }`}
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                        style={{ backgroundColor: `${p.color_hex}22`, color: p.color_hex }}
                      >
                        {p.icon}
                      </div>
                      <div className="min-w-0">
                        {isEditing ? (
                          <div className="space-y-2 max-w-md">
                            <input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-sm font-medium"
                            />
                            <div className="flex flex-wrap gap-1">
                              {PLATFORM_ICON_PRESETS.map((icon) => (
                                <button
                                  key={icon}
                                  type="button"
                                  onClick={() => setEditIcon(icon)}
                                  className={`h-7 w-7 rounded text-sm ${
                                    editIcon === icon ? 'ring-2 ring-ops bg-ops/10' : 'hover:bg-muted'
                                  }`}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 items-center">
                              {PLATFORM_COLOR_PRESETS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditColor(c)}
                                  className={`h-5 w-5 rounded-full ${
                                    editColor === c ? 'ring-2 ring-offset-1 ring-ops' : ''
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                              <input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="h-6 w-8 cursor-pointer"
                              />
                            </div>
                            <input
                              value={editSlug}
                              onChange={(e) =>
                                setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
                              }
                              className="w-full rounded border border-border-subtle bg-background px-2 py-1 text-xs font-mono"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">{p.label}</h3>
                              {!p.is_active && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5">
                                {usage.active_columns}/{usage.columns} cols
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5">
                                {usage.tracker} workers
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5">
                                {usage.orders} orders
                              </span>
                              <span className="rounded bg-muted px-1.5 py-0.5">
                                {usage.registry} registry
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={saving}
                            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium bg-ops text-white disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 rounded border border-border-subtle px-2.5 py-1.5 text-xs hover:bg-muted"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(p)}
                            className="flex items-center gap-1 rounded border border-border-subtle px-2.5 py-1.5 text-xs hover:bg-muted"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setExpandedId(isExpanded ? null : p.id)
                              setMessage(null)
                            }}
                            className="flex items-center gap-1 rounded border border-border-subtle px-2.5 py-1.5 text-xs hover:bg-muted"
                          >
                            <Columns3 className="h-3 w-3" />
                            Columns
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => toggleActive(p)}
                            disabled={saving}
                            className={`flex items-center gap-1 rounded border px-2.5 py-1.5 text-xs disabled:opacity-50 ${
                              p.is_active
                                ? 'border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/5'
                                : 'border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/5'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            {p.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deletePlatform(p)}
                            disabled={saving}
                            className="flex items-center gap-1 rounded border border-red-500/30 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {hasOperationalData(usage) ? 'Hide' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columns panel */}
                {isExpanded && (
                  <div className="border-t border-border-subtle bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">
                        Tracker task columns for {p.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            const src = Number(e.target.value)
                            if (src) cloneColumnsInto(p.id, src)
                            e.target.value = ''
                          }}
                          className="rounded border border-border-subtle bg-background px-2 py-1 text-xs"
                        >
                          <option value="">Clone from…</option>
                          {platforms
                            .filter((x) => x.id !== p.id)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.icon} {x.label}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {columnsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {columns.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2">
                            No columns yet. Add PR / onboarding steps below, or clone from another platform.
                          </p>
                        )}
                        {columns.map((col, index) => (
                          <div
                            key={col.id}
                            className={`flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 ${
                              col.is_active
                                ? 'border-border-subtle bg-card'
                                : 'border-border-subtle bg-muted/40 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-0.5 text-muted-foreground">
                              <GripVertical className="h-3.5 w-3.5" />
                              <button
                                type="button"
                                disabled={index === 0 || saving}
                                onClick={() => moveColumn(p.id, index, -1)}
                                className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                                title="Move up"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={index === columns.length - 1 || saving}
                                onClick={() => moveColumn(p.id, index, 1)}
                                className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
                                title="Move down"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>

                            {editingColId === col.id ? (
                              <input
                                value={editColLabel}
                                onChange={(e) => setEditColLabel(e.target.value)}
                                className="flex-1 min-w-[120px] rounded border border-border-subtle bg-background px-2 py-1 text-xs"
                              />
                            ) : (
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-foreground">
                                  {col.column_label}
                                </span>
                                <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                                  {col.column_key}
                                </span>
                                {!col.is_active && (
                                  <span className="ml-2 text-[10px] text-muted-foreground">inactive</span>
                                )}
                              </div>
                            )}

                            <div className="flex gap-1">
                              {editingColId === col.id ? (
                                <>
                                  <button
                                    onClick={() => saveColumn(col.id, p.id)}
                                    disabled={saving}
                                    className="rounded bg-ops px-2 py-1 text-[10px] text-white disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingColId(null)}
                                    className="rounded border border-border-subtle px-2 py-1 text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingColId(col.id)
                                      setEditColLabel(col.column_label)
                                    }}
                                    className="rounded border border-border-subtle px-2 py-1 text-[10px] hover:bg-muted"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => toggleColumnActive(col)}
                                    disabled={saving}
                                    className="rounded border border-border-subtle px-2 py-1 text-[10px] hover:bg-muted disabled:opacity-50"
                                  >
                                    {col.is_active ? 'Hide' : 'Show'}
                                  </button>
                                  <button
                                    onClick={() => removeColumn(col)}
                                    disabled={saving}
                                    className="rounded border border-red-500/20 px-2 py-1 text-[10px] text-red-600 dark:text-red-400 hover:bg-red-500/5 disabled:opacity-50"
                                  >
                                    {col.is_active ? 'Deactivate' : 'Delete'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <input
                        value={newColLabel}
                        onChange={(e) => setNewColLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addColumn(p.id)
                        }}
                        placeholder="New column label (e.g. Maps QA)"
                        className="min-w-[200px] flex-1 rounded-md border border-border-subtle bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ops/40"
                      />
                      <button
                        onClick={() => addColumn(p.id)}
                        disabled={saving || !newColLabel.trim()}
                        className="flex items-center gap-1 rounded-md bg-ops px-3 py-1.5 text-xs font-medium text-white hover:bg-ops-dark disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" />
                        Add Column
                      </button>
                    </div>

                    <div className="border-t border-border-subtle pt-3">
                      <RevenueSplitPanel platformId={p.id} />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
