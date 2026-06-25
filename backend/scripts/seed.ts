import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import dotenv from 'dotenv'
import * as path from 'path'
import {
  norm, cell, header, batchArray,
  parseTrackerSheet, parseRegistrySheet, parseOrdersSheet, parsePayrollSheet,
  SHEET_MAP, HUB_PLATFORMS,
} from './seed-helpers'

dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function getPlatformMap() {
  const { data, error } = await supabase.from('platforms').select('id, slug')
  if (error) {
    console.error('Error fetching platforms:', error.message)
    process.exit(1)
  }
  return Object.fromEntries((data ?? []).map(p => [p.slug, p.id]))
}

async function seedTracker(platformMap: Record<string, number>) {
  const trackerPath = path.join(__dirname, '../data/AI_JobBoard_Worker_Tracker.xlsx')
  const wb = XLSX.readFile(trackerPath)

  for (const [sheetName, slug] of Object.entries(SHEET_MAP)) {
    const ws = wb.Sheets[sheetName]
    if (!ws) { console.log(`  ⚠ Missing sheet: ${sheetName}`); continue }

    const pid = platformMap[slug]
    if (!pid) continue

    const records = parseTrackerSheet(ws, pid)
    if (!records) { console.log(`  ⚠ No header in: ${sheetName}`); continue }
    if (records.length === 0) { console.log(`  ⚠ No data in: ${sheetName}`); continue }

    for (const batch of batchArray(records, 50)) {
      const { error } = await supabase.from('worker_tracker').insert(batch)
      if (error) console.error(`  ✗ ${sheetName} batch:`, error.message)
    }
    console.log(`  ✓ Tracker ${sheetName}: ${records.length} rows`)
  }
}

async function seedHub(platformMap: Record<string, number>) {
  const hubPath = path.join(__dirname, '../data/AI_Platform_Workers_Hub.xlsx')
  const wb = XLSX.readFile(hubPath)

  for (const [baseName, slug] of HUB_PLATFORMS) {
    const pid = platformMap[slug]
    if (!pid) continue

    // Workers registry
    const wWs = wb.Sheets[baseName]
    if (wWs) {
      const records = parseRegistrySheet(wWs, pid)
      if (records && records.length > 0) {
        const { error } = await supabase.from('workers_registry').insert(records)
        if (error) console.error(`  ✗ Registry ${baseName}:`, error.message)
        else console.log(`  ✓ Registry ${baseName}: ${records.length} rows`)
      }
    }

    // Orders
    const oWs = wb.Sheets[`${baseName} Orders`]
    if (oWs) {
      const records = parseOrdersSheet(oWs, pid)
      if (records && records.length > 0) {
        const { error } = await supabase.from('orders').insert(records)
        if (error) console.error(`  ✗ Orders ${baseName}:`, error.message)
        else console.log(`  ✓ Orders ${baseName}: ${records.length} rows`)
      }
    }

    // Payroll
    const pWs = wb.Sheets[`${baseName} Payroll`]
    if (pWs) {
      const records = parsePayrollSheet(pWs, pid)
      if (records && records.length > 0) {
        const { error } = await supabase.from('payroll').insert(records)
        if (error) console.error(`  ✗ Payroll ${baseName}:`, error.message)
        else console.log(`  ✓ Payroll ${baseName}: ${records.length} rows`)
      }
    }
  }
}

async function main() {
  console.log('\n🌱 Hexagon LABS seed starting...\n')
  const pm = await getPlatformMap()
  console.log('📌 Seeding Job Board Tracker...')
  await seedTracker(pm)
  console.log('\n📌 Seeding Workers Hub...')
  await seedHub(pm)
  console.log('\n✅ Seed complete.\n')
}

main().catch(console.error)
