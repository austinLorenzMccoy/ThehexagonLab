/**
 * seed-helpers.ts — Pure utility functions extracted from seed.ts for testability.
 * All Supabase I/O and file I/O remain in seed.ts; this file is side-effect free.
 */
import * as XLSX from 'xlsx'

export const YN_VALID = ['✅ Yes', '❌ No', '⏳ Pending', '🔄 In Progress', '➖ N/A']
export const W_VALID  = ['🟢 Clear', '🟡 Minor', '🔴 Serious', '⚫ Banned', '➖ None']
export const O_VALID  = ['🟢 Active', '🟡 Pending', '🔵 Processing', '🔴 Issue', '⚫ Cancelled', '✅ Completed']
export const G_VALID  = ['✅ Passed', '❌ Failed', '⏳ Pending', '🔄 Retake', '⭕ Exempted']
export const A_VALID  = ['Full-Time', 'Part-Time', 'Contractor', 'Intern', 'Freelance']
export const M_VALID  = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
export const L_VALID  = ['Linker A', 'Linker B', 'Linker C', 'Linker D', 'Self']

export const SHEET_MAP: Record<string, string> = {
  '🟣 Oneforma': 'oneforma', '🔵 Telus': 'telus',
  '🟢 Data Annotation': 'data_annotation', '🟠 Outlier': 'outlier',
  '🩷 Mercor AI': 'mercor_ai', '🟡 Remotasks': 'remotasks',
  '🔷 Appen': 'appen', '🔶 Clickworker': 'clickworker', '⚫ Scale AI': 'scale_ai',
}

export const HUB_PLATFORMS = [
  ['🟣 Oneforma', 'oneforma'], ['🔵 Telus', 'telus'],
  ['🟢 Data Annotation', 'data_annotation'],
  ['🟠 Outlier', 'outlier'], ['🩷 Mercor AI', 'mercor_ai'],
] as const

/**
 * Normalise a cell value against an allow-list, returning a fallback if invalid.
 */
export function norm(v: unknown, allowed: string[], fallback: string): string {
  const s = String(v ?? '').trim()
  return allowed.includes(s) ? s : fallback
}

/**
 * Extract a trimmed string from a cell in a row array.
 */
export function cell(row: unknown[], idx: number): string {
  return String(row[idx] ?? '').trim()
}

/**
 * Find the index of a header name in a headers array.
 */
export function header(headers: string[], name: string): number {
  return headers.indexOf(name)
}

/**
 * Parse a tracker worksheet into insert-ready records.
 */
export function parseTrackerSheet(
  ws: XLSX.WorkSheet,
  platformId: number,
): Array<Record<string, unknown>> | null {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
  if (hi < 0) return null

  const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
  const data = rows.slice(hi + 1).filter(r => cell(r as unknown[], 0) !== '')
  if (data.length === 0) return []

  const leIdx = headers.indexOf('📜 LE CERT.')
  const taskStart = leIdx >= 0 ? leIdx + 1 : headers.length
  const taskKeys = headers.slice(taskStart).filter(Boolean)

  return data.map(row => {
    const r = row as unknown[]
    const taskStatuses: Record<string, string> = {}
    taskKeys.forEach((k, i) => {
      taskStatuses[k] = norm(r[taskStart + i], YN_VALID, '➖ N/A')
    })
    return {
      platform_id:      platformId,
      owner_name:       cell(r, header(headers, '👤 NAME'))        || 'Unknown',
      linker:           norm(cell(r, header(headers, '🔗 LINKER')), L_VALID, 'Self'),
      worker_name:      cell(r, header(headers, '👷 WORKERS NAME')) || 'Unknown',
      email:            cell(r, header(headers, '📧 EMAIL ADDRESS')) || null,
      apple_connect_pw: cell(r, header(headers, '🍎 APPLE CONNECT PW')) || null,
      platform_id_code: cell(r, header(headers, '🆔 PLATFORM ID')) || null,
      payoneer_linked:  norm(cell(r, header(headers, '💳 PAYONEER LINKED')), YN_VALID, '⏳ Pending'),
      warning_level:    norm(cell(r, header(headers, '⚠️ WARNING')),          W_VALID, '➖ None'),
      sow_done:         norm(cell(r, header(headers, '📄 SOW')),               YN_VALID, '⏳ Pending'),
      le_cert:          norm(cell(r, header(headers, '📜 LE CERT.')),          YN_VALID, '➖ N/A'),
      task_statuses:    taskStatuses,
    }
  })
}

/**
 * Parse a hub registry worksheet into insert-ready records.
 */
export function parseRegistrySheet(
  ws: XLSX.WorkSheet,
  platformId: number,
): Array<Record<string, unknown>> | null {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
  if (hi < 0) return null

  const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
  const data = rows.slice(hi + 1).filter(r => cell(r as unknown[], 0) !== '')
  if (data.length === 0) return []

  return data.map(row => {
    const r = row as unknown[]
    return {
      platform_id:  platformId,
      project_task: cell(r, header(headers, '📋 Project Task')) || 'N/A',
      owner_name:   cell(r, header(headers, '👤 Owner'))        || 'Unknown',
      account_type: norm(cell(r, header(headers, '🏷 Account Type')), A_VALID, 'Freelance'),
      email:        cell(r, header(headers, '📧 Email'))   || null,
      passport:     cell(r, header(headers, '🛂 Passport')) || null,
      geowork_test: norm(cell(r, header(headers, '🌍 Geowork Test')), G_VALID, '⏳ Pending'),
      date_started: null,
    }
  })
}

/**
 * Parse a hub orders worksheet into insert-ready records.
 */
export function parseOrdersSheet(
  ws: XLSX.WorkSheet,
  platformId: number,
): Array<Record<string, unknown>> | null {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const hi = rows.findIndex(r => String((r as unknown[])[0]).trim().includes('Order ID'))
  if (hi < 0) return null

  const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
  const data = rows.slice(hi + 1).filter(r => cell(r as unknown[], 0) !== '')
  if (data.length === 0) return []

  return data.map(row => {
    const r = row as unknown[]
    return {
      platform_id:   platformId,
      order_id_code: cell(r, 0),
      proxy:         cell(r, header(headers, '🌐 Proxy'))  || null,
      owner_name:    cell(r, header(headers, '👤 Owner'))  || 'Unknown',
      status:        norm(cell(r, header(headers, '🚦 Status')), O_VALID, '🟡 Pending'),
      order_date:    null,
      notes:         cell(r, header(headers, '💬 Notes')) || null,
    }
  })
}

/**
 * Parse a hub payroll worksheet into insert-ready records.
 */
export function parsePayrollSheet(
  ws: XLSX.WorkSheet,
  platformId: number,
): Array<Record<string, unknown>> | null {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const hi = rows.findIndex(r => String((r as unknown[])[0]).trim() === '#')
  if (hi < 0) return null

  const headers = (rows[hi] as unknown[]).map(h => String(h).trim())
  const data = rows.slice(hi + 1).filter(r => cell(r as unknown[], 0) !== '')
  if (data.length === 0) return []

  return data.map(row => {
    const r = row as unknown[]
    return {
      platform_id:  platformId,
      account_code: cell(r, header(headers, '🏦 Account')) || 'ACC-000',
      worker_name:  cell(r, header(headers, '👷 Worker'))  || 'Unknown',
      month:        norm(cell(r, header(headers, '📆 Month')), M_VALID, 'January'),
      year:         2025,
      tasks_done:   parseInt(cell(r, header(headers, '✅ Tasks Done'))) || 0,
      pay_usd:      parseFloat(cell(r, header(headers, '💵 Pay ($)'))) || 0,
      notes:        cell(r, header(headers, '💬 Notes')) || null,
    }
  })
}

/**
 * Batch a flat array into chunks of a given size.
 */
export function batchArray<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size))
  }
  return batches
}
