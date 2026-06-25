import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import { buildTrackerWorkbook, buildHubWorkbook } from './mock-helpers'

const OUT_DIR = path.join(__dirname, '../data')

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const trackerWb = buildTrackerWorkbook()
XLSX.writeFile(trackerWb, path.join(OUT_DIR, 'AI_JobBoard_Worker_Tracker.xlsx'))
console.log('✓ Created AI_JobBoard_Worker_Tracker.xlsx')

const hubWb = buildHubWorkbook()
XLSX.writeFile(hubWb, path.join(OUT_DIR, 'AI_Platform_Workers_Hub.xlsx'))
console.log('✓ Created AI_Platform_Workers_Hub.xlsx')

console.log('🎉 Mock spreadsheets successfully created in backend/data/')
