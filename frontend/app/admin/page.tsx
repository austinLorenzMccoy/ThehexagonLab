'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { fetchPlatforms } from '@/lib/db'
import type { UserRole, AppUser, Platform } from '@/types'
import { Settings, Shield, Users, Loader2, Check, X, UserX, UserCheck, Trash2 } from 'lucide-react'

const ROLES: UserRole[] = ['admin', 'manager', 'supervisor', 'worker']

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    'View Dashboard (all platforms)',
    'View/Edit Tracker',
    'View/Edit Registry',
    'Create/Edit Orders',
    'View Payroll',
    'Access Admin Panel',
    'Manage Roles',
    'Export Data',
  ],
  manager: [
    'View Dashboard (assigned)',
    'View/Edit Tracker (assigned)',
    'View/Edit Registry (assigned)',
    'View Orders (if granted)',
    'View Payroll',
    'Export Data',
  ],
  supervisor: [
    'View Dashboard (assigned)',
    'View Tracker (assigned)',
    'View Registry (assigned)',
    'View Orders (if granted)',
  ],
  worker: ['View Dashboard (own data only)'],
}

interface EditState {
  role: UserRole
  platform_access: string[]
  can_view_orders: boolean
}

export default function AdminPage() {
  const { hasRole, appUser, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data)
    }
  }, [])

  useEffect(() => {
    Promise.all([loadUsers(), fetchPlatforms().then(setPlatforms)])
      .finally(() => setLoading(false))
  }, [loadUsers])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }
  if (!hasRole('admin')) {
    return <AccessDenied />
  }

  const startEditing = (user: AppUser) => {
    setEditingId(user.id)
    setEditState({
      role: user.role as UserRole,
      platform_access: user.platform_access ?? [],
      can_view_orders: user.can_view_orders,
    })
    setMessage(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditState(null)
  }

  const saveUser = async (userId: string) => {
    if (!editState) return
    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        role: editState.role,
        platform_access: editState.role === 'admin' ? null : editState.platform_access,
        can_view_orders: editState.role === 'admin' ? true : editState.can_view_orders,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setMessage({ type: 'success', text: 'User updated successfully' })
      setEditingId(null)
      setEditState(null)
      loadUsers()
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to update user' })
    }
  }

  const toggleActive = async (userId: string, currentlyActive: boolean) => {
    if (userId === appUser?.id) {
      setMessage({ type: 'error', text: 'Cannot deactivate yourself' })
      return
    }

    const confirmed = window.confirm(
      currentlyActive
        ? 'Deactivate this user? They will no longer be able to access the system.'
        : 'Reactivate this user? They will regain access to the system.'
    )
    if (!confirmed) return

    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_active: !currentlyActive }),
    })

    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setMessage({ type: 'success', text: currentlyActive ? 'User deactivated' : 'User reactivated' })
      loadUsers()
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to update user' })
    }
  }

  const deleteUser = async (userId: string, displayName: string) => {
    if (userId === appUser?.id) {
      setMessage({ type: 'error', text: 'Cannot delete yourself' })
      return
    }

    const confirmed = window.confirm(
      `Permanently delete user "${displayName}"? This will remove their account and all associated data. This action cannot be undone.`
    )
    if (!confirmed) return

    // Double confirm for safety
    const doubleConfirm = window.confirm(
      `Are you absolutely sure? Type OK to confirm deletion of "${displayName}".`
    )
    if (!doubleConfirm) return

    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await res.json()
    setSaving(false)

    if (res.ok) {
      setMessage({ type: 'success', text: `User "${displayName}" has been permanently deleted` })
      loadUsers()
    } else {
      setMessage({ type: 'error', text: data.error || 'Failed to delete user' })
    }
  }

  const togglePlatform = (slug: string) => {
    if (!editState) return
    setEditState({
      ...editState,
      platform_access: editState.platform_access.includes(slug)
        ? editState.platform_access.filter((s) => s !== slug)
        : [...editState.platform_access, slug],
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Control Tower</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage system roles, permissions, and user accounts
        </p>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'success'
            ? 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400'
            : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Role overview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-ops" />
            <h2 className="text-lg font-semibold text-foreground">Role Permissions</h2>
          </div>

          <div className="space-y-3">
            {ROLES.map((role) => (
              <div key={role} className="rounded-lg border border-border-subtle bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground capitalize">{role}</h3>
                  <span className="rounded-full bg-ops/10 px-2.5 py-1 text-xs font-medium text-ops">
                    {users.filter((u) => u.role === role).length} users
                  </span>
                </div>
                <div className="space-y-1.5">
                  {rolePermissions[role].map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-ops" />
                      <span className="text-xs text-muted-foreground">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User management */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ops" />
            <h2 className="text-lg font-semibold text-foreground">
              User Management ({users.length})
            </h2>
          </div>

          <div className="space-y-3">
            {users.map((user) => {
              const isEditing = editingId === user.id
              const isSelf = user.id === appUser?.id

              return (
                <div
                  key={user.id}
                  className={`rounded-lg border bg-card p-4 transition-colors ${
                    isEditing ? 'border-ops/50'
                    : !user.is_active ? 'border-red-500/30 opacity-60'
                    : 'border-border-subtle hover:border-ops/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">
                          {user.display_name ?? user.email.split('@')[0]}
                        </h3>
                        {!user.is_active && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>

                    {isEditing ? (
                      <select
                        value={editState!.role}
                        onChange={(e) => setEditState({ ...editState!, role: e.target.value as UserRole })}
                        disabled={isSelf}
                        className="rounded border border-ops/30 bg-background px-2 py-1 text-xs font-semibold text-ops focus:outline-none focus:ring-2 focus:ring-ops/50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-ops/10 px-2.5 py-1 text-xs font-semibold text-ops capitalize">
                        {user.role}
                      </span>
                    )}
                  </div>

                  {/* Editing panel */}
                  {isEditing && editState!.role !== 'admin' && (
                    <div className="mt-4 space-y-3 border-t border-border-subtle pt-3">
                      {/* Platform access */}
                      <div>
                        <p className="text-xs font-medium text-foreground mb-2">Platform Access</p>
                        <div className="flex flex-wrap gap-1.5">
                          {platforms.map((p) => {
                            const selected = editState!.platform_access.includes(p.slug)
                            return (
                              <button
                                key={p.slug}
                                onClick={() => togglePlatform(p.slug)}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                  selected
                                    ? 'text-white'
                                    : 'border border-border-subtle text-muted-foreground hover:bg-muted'
                                }`}
                                style={selected ? { backgroundColor: p.color_hex } : undefined}
                              >
                                {p.icon} {p.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Order visibility */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editState!.can_view_orders}
                          onChange={(e) => setEditState({ ...editState!, can_view_orders: e.target.checked })}
                          className="rounded border-border-subtle accent-ops"
                        />
                        <span className="text-xs text-foreground">Can view orders</span>
                      </label>
                    </div>
                  )}

                  {/* Non-editing info */}
                  {!isEditing && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {user.platform_access ? (
                        user.platform_access.map((slug) => (
                          <span key={slug} className="rounded bg-muted px-1.5 py-0.5">{slug}</span>
                        ))
                      ) : (
                        <span className="italic">All platforms</span>
                      )}
                      {user.can_view_orders && (
                        <span className="rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5">
                          Orders ✓
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveUser(user.id)}
                          disabled={saving}
                          className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium bg-ops text-white hover:bg-ops-dark transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium border border-border-subtle hover:bg-muted transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(user)}
                          className="rounded px-3 py-1.5 text-xs font-medium border border-border-subtle hover:bg-muted transition-colors"
                        >
                          Edit Role
                        </button>
                        {!isSelf && (
                          <>
                            <button
                              onClick={() => toggleActive(user.id, user.is_active)}
                              disabled={saving}
                              className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                user.is_active
                                  ? 'border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/5'
                                  : 'border border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/5'
                              }`}
                            >
                              {user.is_active ? (
                                <><UserX className="h-3 w-3" /> Deactivate</>
                              ) : (
                                <><UserCheck className="h-3 w-3" /> Reactivate</>
                              )}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, user.display_name ?? user.email)}
                              disabled={saving}
                              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {user.last_sign_in && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Last sign-in: {new Date(user.last_sign_in).toLocaleString()}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-ops" />
          <h2 className="text-lg font-semibold text-foreground">System Info</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border-subtle bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-card p-4">
            <p className="text-xs text-muted-foreground">Platforms</p>
            <p className="text-2xl font-bold text-foreground">{platforms.length}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-card p-4">
            <p className="text-xs text-muted-foreground">API Status</p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">✅ Operational</p>
          </div>
        </div>
      </div>
    </div>
  )
}
