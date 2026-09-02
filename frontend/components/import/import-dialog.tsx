'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast-context'

interface ImportConfig {
  table: string
  requiredColumns: string[]
  columnMap: Record<string, string> // display name -> db column
  platformId?: number
}

interface ImportDialogProps {
  config: ImportConfig
  onComplete: () => void
  onClose: () => void
}

export function ImportDialog({ config, onComplete, onClose }: ImportDialogProps) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      if (json.length === 0) {
        toast('File is empty', 'error')
        return
      }

      const fileHeaders = Object.keys(json[0])
      setHeaders(fileHeaders)
      setPreview(json.slice(0, 5))

      // Auto-map columns by fuzzy matching
      const autoMap: Record<string, string> = {}
      for (const [display, dbCol] of Object.entries(config.columnMap)) {
        const match = fileHeaders.find(
          (h) =>
            h.toLowerCase() === display.toLowerCase() ||
            h.toLowerCase() === dbCol.toLowerCase() ||
            h.toLowerCase().replace(/[_\s]/g, '') === dbCol.toLowerCase().replace(/[_\s]/g, '')
        )
        if (match) autoMap[dbCol] = match
      }
      setMapping(autoMap)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    setImporting(true)
    const supabase = createClient()

    const reader = new FileReader()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

      let success = 0
      let errors = 0

      // Batch insert in chunks of 50
      const rows = json.map((row) => {
        const mapped: Record<string, unknown> = {}
        for (const [dbCol, fileCol] of Object.entries(mapping)) {
          if (fileCol && row[fileCol] !== undefined) {
            mapped[dbCol] = row[fileCol] || null
          }
        }
        if (config.platformId) mapped.platform_id = config.platformId
        return mapped
      })

      const chunkSize = 50
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const { error } = await supabase.from(config.table).insert(chunk as any)
        if (error) {
          errors += chunk.length
          console.error('Import error:', error.message)
        } else {
          success += chunk.length
        }
      }

      setResult({ success, errors })
      setImporting(false)
      toast(`Imported ${success} rows${errors > 0 ? `, ${errors} errors` : ''}`, errors > 0 ? 'error' : 'success')
      if (success > 0) onComplete()
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-border-subtle bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-ops" />
            <h2 className="text-lg font-semibold text-foreground">Import Data</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* File picker */}
          {preview.length === 0 && (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border-subtle bg-background/50 p-8 cursor-pointer hover:border-ops/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">
                Click to upload Excel or CSV
              </p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv supported</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          )}

          {/* Column mapping */}
          {preview.length > 0 && !result && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Column Mapping</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Map your file columns to database fields. Required fields are marked with *.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(config.columnMap).map(([display, dbCol]) => {
                    const isRequired = config.requiredColumns.includes(dbCol)
                    return (
                      <div key={dbCol} className="flex items-center gap-2">
                        <label className="text-xs font-medium text-foreground w-28 flex-shrink-0">
                          {display}{isRequired && <span className="text-red-500"> *</span>}
                        </label>
                        <select
                          value={mapping[dbCol] ?? ''}
                          onChange={(e) => setMapping({ ...mapping, [dbCol]: e.target.value })}
                          className="flex-1 rounded border border-border-subtle bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ops/50"
                        >
                          <option value="">— Skip —</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Preview (first {preview.length} rows)
                </h3>
                <div className="overflow-x-auto rounded border border-border-subtle">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {headers.slice(0, 6).map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {headers.slice(0, 6).map((h) => (
                            <td key={h} className="px-2 py-1 text-foreground whitespace-nowrap max-w-[120px] truncate">
                              {row[h] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleImport}
                disabled={importing || config.requiredColumns.some((col) => !mapping[col])}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-ops px-4 py-2.5 text-sm font-medium text-white hover:bg-ops-dark transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Import Data</>
                )}
              </button>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="text-center py-4">
              {result.errors === 0 ? (
                <>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-foreground">
                    Successfully imported {result.success} rows
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-foreground">
                    {result.success} imported, {result.errors} errors
                  </p>
                </>
              )}
              <button
                onClick={onClose}
                className="mt-4 rounded-lg bg-ops px-6 py-2 text-sm font-medium text-white hover:bg-ops-dark transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Pre-configured import configs for each table
export const IMPORT_CONFIGS: Record<string, Omit<ImportConfig, 'platformId'>> = {
  worker_tracker: {
    table: 'worker_tracker',
    requiredColumns: ['owner_name', 'worker_name'],
    columnMap: {
      'Owner Name': 'owner_name',
      'Worker Name': 'worker_name',
      'Email': 'email',
      'Linker': 'linker',
      'Warning': 'warning_level',
      'Payoneer': 'payoneer_linked',
      'SOW': 'sow_done',
      'LE Cert': 'le_cert',
      'Notes': 'notes',
    },
  },
  workers_registry: {
    table: 'workers_registry',
    requiredColumns: ['project_task', 'owner_name', 'account_type'],
    columnMap: {
      'Project/Task': 'project_task',
      'Owner Name': 'owner_name',
      'Account Type': 'account_type',
      'Email': 'email',
      'Geowork Test': 'geowork_test',
      'Date Started': 'date_started',
      'Notes': 'notes',
    },
  },
  orders: {
    table: 'orders',
    requiredColumns: ['order_id_code', 'owner_name'],
    columnMap: {
      'Order ID': 'order_id_code',
      'Owner Name': 'owner_name',
      'Proxy': 'proxy',
      'Status': 'status',
      'Order Date': 'order_date',
      'Notes': 'notes',
    },
  },
  payroll: {
    table: 'payroll',
    requiredColumns: ['account_code', 'worker_name', 'month', 'year'],
    columnMap: {
      'Account Code': 'account_code',
      'Worker Name': 'worker_name',
      'Month': 'month',
      'Year': 'year',
      'Tasks Done': 'tasks_done',
      'Pay (USD)': 'pay_usd',
      'Notes': 'notes',
    },
  },
  onboarding: {
    table: 'onboarding',
    requiredColumns: ['applicant_name'],
    columnMap: {
      'Applicant Name': 'applicant_name',
      'Email': 'email',
      'Password': 'password',
      'Phone': 'phone',
      'Country': 'country',
      'Referral': 'referral',
      'Status': 'application_status',
      'Date Applied': 'date_applied',
      'Notes': 'notes',
    },
  },
  partner_contacts: {
    table: 'partner_contacts',
    requiredColumns: ['name'],
    columnMap: {
      'Name': 'name',
      'Email': 'email',
      'Phone': 'phone',
      'Country': 'country',
      'Type': 'contact_type',
      'Source': 'source',
      'Notes': 'notes',
    },
  },
}
