'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { AccessDenied } from '@/components/ui/access-denied'
import { fetchPartnerContacts, insertPartnerContact, deletePartnerContact } from '@/lib/db'
import { ImportDialog, IMPORT_CONFIGS } from '@/components/import/import-dialog'
import type { PartnerContactRow, PartnerContactType } from '@/types'
import { Loader2, Contact, Plus, X, Trash2, Upload } from 'lucide-react'

const TYPE_LABEL: Record<PartnerContactType, string> = {
  worker: 'Worker', referrer: 'Referrer', partner: 'Partner / Client',
}

/** Partner / contact records — builds a reusable contact database from
 *  workers, referrers, and upstream partners for future outreach.
 *  Bulk Excel/CSV import reuses the shared ImportDialog component
 *  (see components/import/import-dialog.tsx). */
export default function PartnersPage() {
  const { hasAccess, appUser, permissions } = useAuth()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<PartnerContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filter, setFilter] = useState<PartnerContactType | null>(null)

  const reload = () => fetchPartnerContacts().then(setContacts)

  useEffect(() => {
    fetchPartnerContacts().then((data) => { setContacts(data); setLoading(false) })
  }, [])

  if (!hasAccess('partners')) return <AccessDenied />

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { error } = await insertPartnerContact({
      name: fd.get('name') as string,
      email: (fd.get('email') as string) || null,
      phone: (fd.get('phone') as string) || null,
      country: (fd.get('country') as string) || null,
      contact_type: fd.get('contact_type') as PartnerContactType,
      source: 'Manual',
      notes: (fd.get('notes') as string) || null,
      created_by: appUser?.id ?? null,
    })
    if (error) { toast(`Could not add contact: ${error}`, 'error'); return }
    toast('Contact added', 'success')
    setShowForm(false)
    setContacts(await fetchPartnerContacts())
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this contact?')) return
    const { error } = await deletePartnerContact(id)
    if (error) { toast(`Could not delete: ${error}`, 'error'); return }
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered = filter ? contacts.filter((c) => c.contact_type === filter) : contacts

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Partner Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workers, referrers, and upstream partners — one reusable contact database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Contact'}
          </button>
        </div>
      </div>

      {showImport && (
        <ImportDialog
          config={IMPORT_CONFIGS.partner_contacts}
          onComplete={() => { setShowImport(false); reload() }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 rounded-lg border border-ops/20 bg-ops/5 p-6 sm:grid-cols-3">
          <input name="name" required placeholder="Name" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          <input name="phone" placeholder="Phone" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          <input name="country" placeholder="Country" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          <select name="contact_type" defaultValue="partner" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm">
            {(Object.keys(TYPE_LABEL) as PartnerContactType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>
          <input name="notes" placeholder="Notes" className="rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-ops px-4 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors sm:col-span-3">
            Save Contact
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            filter === null ? 'bg-ops text-white' : 'border border-border-subtle text-muted-foreground hover:bg-muted'
          }`}
        >
          All ({contacts.length})
        </button>
        {(Object.keys(TYPE_LABEL) as PartnerContactType[]).map((t) => {
          const count = contacts.filter((c) => c.contact_type === t).length
          if (count === 0) return null
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === t ? 'bg-ops text-white' : 'border border-border-subtle text-muted-foreground hover:bg-muted'
              }`}
            >
              {TYPE_LABEL[t]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-card py-16">
          <Contact className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No contacts yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-card">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Name</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Type</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Email</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Phone</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Country</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.map((c) => (
                <tr key={c.id} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{c.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{TYPE_LABEL[c.contact_type]}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-foreground">{c.country ?? '—'}</td>
                  <td className="px-3 py-2">
                    {permissions?.canManagePartnerContacts && (
                      <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-red-500/10 transition-colors" title="Delete contact">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
