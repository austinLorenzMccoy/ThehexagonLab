import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  buildTrackerWorkbook, buildHubWorkbook,
  TRACKER_SHEETS, HUB_PLATFORMS_DEF,
  LINKERS, WARNINGS, YN, ACCT_TYPES, GEO, ORD_STATUS, MONTHS,
} from '../scripts/mock-helpers'

// ── Constants ──────────────────────────────────────────────────────

describe('mock-helpers constants', () => {
  it('TRACKER_SHEETS has 9 platform definitions', () => {
    expect(TRACKER_SHEETS).toHaveLength(9)
    for (const s of TRACKER_SHEETS) {
      expect(s.name).toBeTruthy()
      expect(s.columns.length).toBeGreaterThan(0)
    }
  })

  it('HUB_PLATFORMS_DEF has 5 entries', () => {
    expect(HUB_PLATFORMS_DEF).toHaveLength(5)
    for (const p of HUB_PLATFORMS_DEF) {
      expect(p.name).toBeTruthy()
      expect(p.base).toBeTruthy()
    }
  })

  it('LINKERS has 5 values', () => {
    expect(LINKERS).toEqual(['Linker A', 'Linker B', 'Linker C', 'Linker D', 'Self'])
  })

  it('WARNINGS has 5 values', () => {
    expect(WARNINGS).toHaveLength(5)
  })

  it('YN has 5 values', () => {
    expect(YN).toHaveLength(5)
  })

  it('ACCT_TYPES has 5 values', () => {
    expect(ACCT_TYPES).toHaveLength(5)
  })

  it('GEO has 5 values', () => {
    expect(GEO).toHaveLength(5)
  })

  it('ORD_STATUS has 6 values', () => {
    expect(ORD_STATUS).toHaveLength(6)
  })

  it('MONTHS has 12 values starting with January', () => {
    expect(MONTHS).toHaveLength(12)
    expect(MONTHS[0]).toBe('January')
    expect(MONTHS[11]).toBe('December')
  })
})

// ── buildTrackerWorkbook() ─────────────────────────────────────────

describe('buildTrackerWorkbook()', () => {
  it('creates a workbook with 9 sheets', () => {
    const wb = buildTrackerWorkbook()
    expect(wb.SheetNames).toHaveLength(9)
  })

  it('each sheet has the correct platform name', () => {
    const wb = buildTrackerWorkbook()
    for (const s of TRACKER_SHEETS) {
      expect(wb.SheetNames).toContain(s.name)
    }
  })

  it('each sheet has a header row and 3 data rows', () => {
    const wb = buildTrackerWorkbook()
    for (const s of TRACKER_SHEETS) {
      const ws = wb.Sheets[s.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      // 1 header + 3 data rows
      expect(data.length).toBe(4)
    }
  })

  it('header row has all standard columns + platform task columns', () => {
    const wb = buildTrackerWorkbook()
    for (const s of TRACKER_SHEETS) {
      const ws = wb.Sheets[s.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const headers = (data[0] as string[])
      // Standard: 11 columns + platform-specific task columns
      expect(headers.length).toBe(11 + s.columns.length)
      expect(headers[0]).toBe('#')
      expect(headers[1]).toBe('👤 NAME')
      expect(headers[10]).toBe('📜 LE CERT.')
      // Task columns start at index 11
      for (let i = 0; i < s.columns.length; i++) {
        expect(headers[11 + i]).toBe(s.columns[i])
      }
    }
  })

  it('data rows contain valid linker values', () => {
    const wb = buildTrackerWorkbook()
    const ws = wb.Sheets[TRACKER_SHEETS[0].name]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    for (let i = 1; i < data.length; i++) {
      const linker = String((data[i] as unknown[])[2])
      expect(LINKERS).toContain(linker)
    }
  })

  it('data rows contain valid warning levels', () => {
    const wb = buildTrackerWorkbook()
    const ws = wb.Sheets[TRACKER_SHEETS[0].name]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    for (let i = 1; i < data.length; i++) {
      const warning = String((data[i] as unknown[])[8])
      expect(WARNINGS).toContain(warning)
    }
  })

  it('data rows contain valid YN status values', () => {
    const wb = buildTrackerWorkbook()
    const ws = wb.Sheets[TRACKER_SHEETS[0].name]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    for (let i = 1; i < data.length; i++) {
      const payoneer = String((data[i] as unknown[])[7])
      expect(YN).toContain(payoneer)
    }
  })

  it('each worker row has a non-empty name and email', () => {
    const wb = buildTrackerWorkbook()
    for (const s of TRACKER_SHEETS) {
      const ws = wb.Sheets[s.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as string[]
        expect(row[1]).toBeTruthy()  // owner name
        expect(row[3]).toBeTruthy()  // worker name
        expect(row[4]).toContain('@') // email
      }
    }
  })
})

// ── buildHubWorkbook() ─────────────────────────────────────────────

describe('buildHubWorkbook()', () => {
  it('creates a workbook with 15 sheets (5 platforms × 3 sheet types)', () => {
    const wb = buildHubWorkbook()
    // 5 platforms × 3 (registry + orders + payroll) = 15
    expect(wb.SheetNames).toHaveLength(15)
  })

  it('has registry, orders, and payroll sheets for each platform', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      expect(wb.SheetNames).toContain(p.name)
      expect(wb.SheetNames).toContain(`${p.name} Orders`)
      expect(wb.SheetNames).toContain(`${p.name} Payroll`)
    }
  })

  it('registry sheets have header + 3 data rows', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[p.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      expect(data).toHaveLength(4)
      // Verify header
      const headers = data[0] as string[]
      expect(headers[0]).toBe('#')
      expect(headers).toContain('📋 Project Task')
      expect(headers).toContain('🌍 Geowork Test')
    }
  })

  it('orders sheets have header + 3 data rows', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Orders`]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      expect(data).toHaveLength(4)
      const headers = data[0] as string[]
      expect(headers[0]).toBe('Order ID')
    }
  })

  it('payroll sheets have header + 3 data rows', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Payroll`]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      expect(data).toHaveLength(4)
      const headers = data[0] as string[]
      expect(headers).toContain('📆 Month')
      expect(headers).toContain('💵 Pay ($)')
    }
  })

  it('registry data contains valid account types', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[p.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        expect(ACCT_TYPES).toContain(String((data[i] as unknown[])[3]))
      }
    }
  })

  it('registry data contains valid geowork statuses', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[p.name]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        expect(GEO).toContain(String((data[i] as unknown[])[6]))
      }
    }
  })

  it('orders data contains valid order statuses', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Orders`]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        expect(ORD_STATUS).toContain(String((data[i] as unknown[])[3]))
      }
    }
  })

  it('payroll data contains valid months', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Payroll`]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        expect(MONTHS).toContain(String((data[i] as unknown[])[4]))
      }
    }
  })

  it('payroll data has numeric tasks_done and pay values', () => {
    const wb = buildHubWorkbook()
    const p = HUB_PLATFORMS_DEF[0]
    const ws = wb.Sheets[`${p.name} Payroll`]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      expect(Number(row[5])).toBeGreaterThan(0) // tasks done
      expect(Number(row[6])).toBeGreaterThan(0) // pay
    }
  })

  it('order IDs follow expected format', () => {
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Orders`]
      const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      for (let i = 1; i < data.length; i++) {
        const orderId = String((data[i] as unknown[])[0])
        expect(orderId).toMatch(/^ORD-/)
      }
    }
  })
})

// ── Integration: tracker → parse round-trip ────────────────────────

describe('round-trip: buildTrackerWorkbook → parseTrackerSheet', () => {
  it('generated tracker sheets can be parsed back by parseTrackerSheet', async () => {
    const { parseTrackerSheet } = await import('../scripts/seed-helpers')
    const wb = buildTrackerWorkbook()

    for (const s of TRACKER_SHEETS) {
      const ws = wb.Sheets[s.name]
      const result = parseTrackerSheet(ws, 99)
      expect(result).not.toBeNull()
      expect(result!.length).toBe(3) // 3 mock workers per sheet
      for (const rec of result!) {
        expect(rec.platform_id).toBe(99)
        expect(rec.owner_name).toBeTruthy()
        expect(rec.worker_name).toBeTruthy()
      }
    }
  })
})

describe('round-trip: buildHubWorkbook → parse helpers', () => {
  it('generated registry sheets can be parsed by parseRegistrySheet', async () => {
    const { parseRegistrySheet } = await import('../scripts/seed-helpers')
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[p.name]
      const result = parseRegistrySheet(ws, 42)
      expect(result).not.toBeNull()
      expect(result!.length).toBe(3)
    }
  })

  it('generated orders sheets can be parsed by parseOrdersSheet', async () => {
    const { parseOrdersSheet } = await import('../scripts/seed-helpers')
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Orders`]
      const result = parseOrdersSheet(ws, 42)
      expect(result).not.toBeNull()
      expect(result!.length).toBe(3)
    }
  })

  it('generated payroll sheets can be parsed by parsePayrollSheet', async () => {
    const { parsePayrollSheet } = await import('../scripts/seed-helpers')
    const wb = buildHubWorkbook()
    for (const p of HUB_PLATFORMS_DEF) {
      const ws = wb.Sheets[`${p.name} Payroll`]
      const result = parsePayrollSheet(ws, 42)
      expect(result).not.toBeNull()
      expect(result!.length).toBe(3)
    }
  })
})
