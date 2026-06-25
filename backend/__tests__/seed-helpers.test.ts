import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  norm, cell, header, batchArray,
  parseTrackerSheet, parseRegistrySheet, parseOrdersSheet, parsePayrollSheet,
  YN_VALID, W_VALID, O_VALID, G_VALID, A_VALID, M_VALID, L_VALID,
  SHEET_MAP, HUB_PLATFORMS,
} from '../scripts/seed-helpers'

// ── Constants ──────────────────────────────────────────────────────

describe('seed-helpers constants', () => {
  it('YN_VALID contains 5 statuses', () => {
    expect(YN_VALID).toHaveLength(5)
    expect(YN_VALID).toContain('✅ Yes')
    expect(YN_VALID).toContain('❌ No')
    expect(YN_VALID).toContain('⏳ Pending')
    expect(YN_VALID).toContain('🔄 In Progress')
    expect(YN_VALID).toContain('➖ N/A')
  })

  it('W_VALID contains 5 warning levels', () => {
    expect(W_VALID).toHaveLength(5)
    expect(W_VALID).toContain('🟢 Clear')
    expect(W_VALID).toContain('⚫ Banned')
  })

  it('O_VALID contains 6 order statuses', () => {
    expect(O_VALID).toHaveLength(6)
  })

  it('G_VALID contains 5 geowork statuses', () => {
    expect(G_VALID).toHaveLength(5)
  })

  it('A_VALID contains 5 account types', () => {
    expect(A_VALID).toHaveLength(5)
  })

  it('M_VALID contains 12 months', () => {
    expect(M_VALID).toHaveLength(12)
    expect(M_VALID[0]).toBe('January')
    expect(M_VALID[11]).toBe('December')
  })

  it('L_VALID contains 5 linkers', () => {
    expect(L_VALID).toHaveLength(5)
  })

  it('SHEET_MAP has 9 platform entries', () => {
    expect(Object.keys(SHEET_MAP)).toHaveLength(9)
    expect(SHEET_MAP['🟣 Oneforma']).toBe('oneforma')
    expect(SHEET_MAP['⚫ Scale AI']).toBe('scale_ai')
  })

  it('HUB_PLATFORMS has 5 entries', () => {
    expect(HUB_PLATFORMS).toHaveLength(5)
    expect(HUB_PLATFORMS[0][1]).toBe('oneforma')
  })
})

// ── norm() ─────────────────────────────────────────────────────────

describe('norm()', () => {
  it('returns the value when it is in the allowed list', () => {
    expect(norm('✅ Yes', YN_VALID, '➖ N/A')).toBe('✅ Yes')
  })

  it('returns fallback when value is not in allowed list', () => {
    expect(norm('INVALID', YN_VALID, '➖ N/A')).toBe('➖ N/A')
  })

  it('returns fallback for null/undefined', () => {
    expect(norm(null, YN_VALID, '⏳ Pending')).toBe('⏳ Pending')
    expect(norm(undefined, YN_VALID, '⏳ Pending')).toBe('⏳ Pending')
  })

  it('trims whitespace before matching', () => {
    expect(norm('  ✅ Yes  ', YN_VALID, '➖ N/A')).toBe('✅ Yes')
  })

  it('returns fallback for empty string', () => {
    expect(norm('', YN_VALID, '➖ N/A')).toBe('➖ N/A')
  })

  it('works with all valid lists', () => {
    expect(norm('🟢 Clear', W_VALID, '➖ None')).toBe('🟢 Clear')
    expect(norm('🟢 Active', O_VALID, '🟡 Pending')).toBe('🟢 Active')
    expect(norm('✅ Passed', G_VALID, '⏳ Pending')).toBe('✅ Passed')
    expect(norm('Full-Time', A_VALID, 'Freelance')).toBe('Full-Time')
    expect(norm('January', M_VALID, 'January')).toBe('January')
    expect(norm('Self', L_VALID, 'Self')).toBe('Self')
  })
})

// ── cell() ─────────────────────────────────────────────────────────

describe('cell()', () => {
  it('extracts and trims a cell value', () => {
    expect(cell(['  hello ', 'world'], 0)).toBe('hello')
    expect(cell(['  hello ', 'world'], 1)).toBe('world')
  })

  it('returns empty string for out-of-bounds index', () => {
    expect(cell(['a'], 5)).toBe('')
  })

  it('converts null/undefined to empty string', () => {
    expect(cell([null, undefined], 0)).toBe('')
    expect(cell([null, undefined], 1)).toBe('')
  })

  it('converts numbers to strings', () => {
    expect(cell([42], 0)).toBe('42')
  })
})

// ── header() ───────────────────────────────────────────────────────

describe('header()', () => {
  it('returns the index of the header name', () => {
    expect(header(['#', '👤 NAME', '🔗 LINKER'], '👤 NAME')).toBe(1)
  })

  it('returns -1 for missing header', () => {
    expect(header(['#', '👤 NAME'], '🔗 LINKER')).toBe(-1)
  })

  it('works with empty array', () => {
    expect(header([], 'foo')).toBe(-1)
  })
})

// ── batchArray() ───────────────────────────────────────────────────

describe('batchArray()', () => {
  it('splits an array into chunks of the given size', () => {
    const result = batchArray([1, 2, 3, 4, 5], 2)
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns a single batch when array fits', () => {
    const result = batchArray([1, 2], 5)
    expect(result).toEqual([[1, 2]])
  })

  it('returns empty array for empty input', () => {
    expect(batchArray([], 3)).toEqual([])
  })

  it('handles batch size of 1', () => {
    expect(batchArray([1, 2, 3], 1)).toEqual([[1], [2], [3]])
  })

  it('handles batch size equal to array length', () => {
    expect(batchArray([1, 2, 3], 3)).toEqual([[1, 2, 3]])
  })
})

// ── Worksheet helpers ──────────────────────────────────────────────

function makeSheet(data: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(data)
}

// ── parseTrackerSheet() ────────────────────────────────────────────

describe('parseTrackerSheet()', () => {
  it('parses a valid tracker worksheet', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.', 'Task1'],
      ['1', 'Owner A', 'Linker A', 'Worker A', 'a@test.com',
       'pw123', 'ID-001', '✅ Yes', '🟢 Clear', '✅ Yes', '❌ No', '✅ Yes'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)

    expect(result).not.toBeNull()
    expect(result).toHaveLength(1)
    expect(result![0]).toMatchObject({
      platform_id: 1,
      owner_name: 'Owner A',
      linker: 'Linker A',
      worker_name: 'Worker A',
      email: 'a@test.com',
      apple_connect_pw: 'pw123',
      platform_id_code: 'ID-001',
      payoneer_linked: '✅ Yes',
      warning_level: '🟢 Clear',
      sow_done: '✅ Yes',
      le_cert: '❌ No',
      task_statuses: { Task1: '✅ Yes' },
    })
  })

  it('returns null when no header row found', () => {
    const ws = makeSheet([['no', 'header', 'row']])
    expect(parseTrackerSheet(ws, 1)).toBeNull()
  })

  it('returns empty array when no data rows after header', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    expect(result).toEqual([])
  })

  it('skips rows with empty first cell', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.'],
      ['1', 'Owner A', 'Linker A', 'Worker A', '', '', '', '✅ Yes', '🟢 Clear', '✅ Yes', '❌ No'],
      ['', '', '', '', '', '', '', '', '', '', ''],  // should be skipped
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 2)
    expect(result).toHaveLength(1)
  })

  it('normalises invalid values to fallbacks', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.', 'T1'],
      ['1', '', 'BAD LINKER', '', '', '', '', 'INVALID', 'INVALID', 'INVALID', 'INVALID', 'INVALID'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    expect(result).toHaveLength(1)
    expect(result![0].owner_name).toBe('Unknown')
    expect(result![0].worker_name).toBe('Unknown')
    expect(result![0].linker).toBe('Self')
    expect(result![0].payoneer_linked).toBe('⏳ Pending')
    expect(result![0].warning_level).toBe('➖ None')
    expect(result![0].sow_done).toBe('⏳ Pending')
    expect(result![0].le_cert).toBe('➖ N/A')
    expect((result![0].task_statuses as Record<string, string>)['T1']).toBe('➖ N/A')
  })

  it('handles multiple task columns', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.', 'T1', 'T2', 'T3'],
      ['1', 'O', 'Self', 'W', 'e@t.com', '', '', '✅ Yes', '🟢 Clear', '✅ Yes', '✅ Yes',
       '✅ Yes', '❌ No', '⏳ Pending'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    const tasks = result![0].task_statuses as Record<string, string>
    expect(Object.keys(tasks)).toEqual(['T1', 'T2', 'T3'])
    expect(tasks['T1']).toBe('✅ Yes')
    expect(tasks['T2']).toBe('❌ No')
    expect(tasks['T3']).toBe('⏳ Pending')
  })

  it('sets null for empty optional fields', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.'],
      ['1', 'Owner', 'Self', 'Worker', '', '', '', '✅ Yes', '🟢 Clear', '✅ Yes', '✅ Yes'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    expect(result![0].email).toBeNull()
    expect(result![0].apple_connect_pw).toBeNull()
    expect(result![0].platform_id_code).toBeNull()
  })

  it('handles sheet with title rows before header', () => {
    const data = [
      ['Title Row', '', ''],
      ['Sub-title', '', ''],
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW', '📜 LE CERT.'],
      ['1', 'Owner A', 'Self', 'Worker A', 'a@test.com', '', '', '✅ Yes', '🟢 Clear', '✅ Yes', '✅ Yes'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    expect(result).toHaveLength(1)
    expect(result![0].owner_name).toBe('Owner A')
  })

  it('handles sheet where LE CERT is missing (taskStart defaults to headers.length)', () => {
    const data = [
      ['#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
       '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
       '⚠️ WARNING', '📄 SOW'],
      ['1', 'Owner', 'Self', 'Worker', 'e@t.com', '', '', '✅ Yes', '🟢 Clear', '✅ Yes'],
    ]
    const ws = makeSheet(data)
    const result = parseTrackerSheet(ws, 1)
    expect(result).toHaveLength(1)
    expect(result![0].task_statuses).toEqual({})
    expect(result![0].le_cert).toBe('➖ N/A') // Not found => fallback
  })
})

// ── parseRegistrySheet() ───────────────────────────────────────────

describe('parseRegistrySheet()', () => {
  it('parses a valid registry worksheet', () => {
    const data = [
      ['#', '📋 Project Task', '👤 Owner', '🏷 Account Type', '📧 Email', '🛂 Passport', '🌍 Geowork Test'],
      ['1', 'Task-Model-1', 'Owner 1', 'Full-Time', 'w@test.com', 'PASS-123', '✅ Passed'],
    ]
    const ws = makeSheet(data)
    const result = parseRegistrySheet(ws, 5)
    expect(result).toHaveLength(1)
    expect(result![0]).toMatchObject({
      platform_id: 5,
      project_task: 'Task-Model-1',
      owner_name: 'Owner 1',
      account_type: 'Full-Time',
      email: 'w@test.com',
      passport: 'PASS-123',
      geowork_test: '✅ Passed',
      date_started: null,
    })
  })

  it('returns null when no header', () => {
    expect(parseRegistrySheet(makeSheet([['random']]), 1)).toBeNull()
  })

  it('returns empty when no data rows', () => {
    const data = [['#', '📋 Project Task', '👤 Owner', '🏷 Account Type', '📧 Email', '🛂 Passport', '🌍 Geowork Test']]
    expect(parseRegistrySheet(makeSheet(data), 1)).toEqual([])
  })

  it('normalises invalid account type and geowork values', () => {
    const data = [
      ['#', '📋 Project Task', '👤 Owner', '🏷 Account Type', '📧 Email', '🛂 Passport', '🌍 Geowork Test'],
      ['1', '', '', 'INVALID', '', '', 'INVALID'],
    ]
    const result = parseRegistrySheet(makeSheet(data), 1)
    expect(result![0].account_type).toBe('Freelance')
    expect(result![0].geowork_test).toBe('⏳ Pending')
    expect(result![0].project_task).toBe('N/A')
    expect(result![0].owner_name).toBe('Unknown')
    expect(result![0].email).toBeNull()
    expect(result![0].passport).toBeNull()
  })
})

// ── parseOrdersSheet() ─────────────────────────────────────────────

describe('parseOrdersSheet()', () => {
  it('parses a valid orders worksheet', () => {
    const data = [
      ['Order ID', '🌐 Proxy', '👤 Owner', '🚦 Status', '💬 Notes'],
      ['ORD-001', '192.168.1.11', 'Owner 1', '🟢 Active', 'Test note'],
    ]
    const result = parseOrdersSheet(makeSheet(data), 3)
    expect(result).toHaveLength(1)
    expect(result![0]).toMatchObject({
      platform_id: 3,
      order_id_code: 'ORD-001',
      proxy: '192.168.1.11',
      owner_name: 'Owner 1',
      status: '🟢 Active',
      order_date: null,
      notes: 'Test note',
    })
  })

  it('returns null when no Order ID header', () => {
    expect(parseOrdersSheet(makeSheet([['random']]), 1)).toBeNull()
  })

  it('returns empty when no data rows', () => {
    const data = [['Order ID', '🌐 Proxy', '👤 Owner', '🚦 Status', '💬 Notes']]
    expect(parseOrdersSheet(makeSheet(data), 1)).toEqual([])
  })

  it('normalises invalid status and handles empty fields', () => {
    const data = [
      ['Order ID', '🌐 Proxy', '👤 Owner', '🚦 Status', '💬 Notes'],
      ['ORD-X', '', '', 'INVALID', ''],
    ]
    const result = parseOrdersSheet(makeSheet(data), 1)
    expect(result![0].status).toBe('🟡 Pending')
    expect(result![0].proxy).toBeNull()
    expect(result![0].owner_name).toBe('Unknown')
    expect(result![0].notes).toBeNull()
  })
})

// ── parsePayrollSheet() ────────────────────────────────────────────

describe('parsePayrollSheet()', () => {
  it('parses a valid payroll worksheet', () => {
    const data = [
      ['#', '🏦 Account', '👷 Worker', '% Task Completeness', '📆 Month', '✅ Tasks Done', '💵 Pay ($)', '💬 Notes'],
      ['1', 'ACC-001', 'Worker 1', '100%', 'January', '25', '325.50', 'Payroll note'],
    ]
    const result = parsePayrollSheet(makeSheet(data), 4)
    expect(result).toHaveLength(1)
    expect(result![0]).toMatchObject({
      platform_id: 4,
      account_code: 'ACC-001',
      worker_name: 'Worker 1',
      month: 'January',
      year: 2025,
      tasks_done: 25,
      pay_usd: 325.50,
      notes: 'Payroll note',
    })
  })

  it('returns null when no header', () => {
    expect(parsePayrollSheet(makeSheet([['random']]), 1)).toBeNull()
  })

  it('returns empty when no data rows', () => {
    const data = [['#', '🏦 Account', '👷 Worker', '% Task Completeness', '📆 Month', '✅ Tasks Done', '💵 Pay ($)', '💬 Notes']]
    expect(parsePayrollSheet(makeSheet(data), 1)).toEqual([])
  })

  it('normalises invalid month and handles missing numerics', () => {
    const data = [
      ['#', '🏦 Account', '👷 Worker', '% Task Completeness', '📆 Month', '✅ Tasks Done', '💵 Pay ($)', '💬 Notes'],
      ['1', '', '', '', 'INVALID_MONTH', 'not-a-number', 'not-a-number', ''],
    ]
    const result = parsePayrollSheet(makeSheet(data), 1)
    expect(result![0].month).toBe('January')
    expect(result![0].tasks_done).toBe(0)
    expect(result![0].pay_usd).toBe(0)
    expect(result![0].account_code).toBe('ACC-000')
    expect(result![0].worker_name).toBe('Unknown')
    expect(result![0].notes).toBeNull()
  })
})
