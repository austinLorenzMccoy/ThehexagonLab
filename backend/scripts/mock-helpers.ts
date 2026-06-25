/**
 * mock-helpers.ts — Pure functions extracted from generateMockExcel.ts for testability.
 */
import * as XLSX from 'xlsx'

export interface SheetDef {
  name: string
  columns: string[]
}

export const TRACKER_SHEETS: SheetDef[] = [
  { name: '🟣 Oneforma', columns: ['PR', 'TA MSG REPLY', 'VCG TTI', 'VCG MSG BG', 'CYU WEBSITE TOPIC', 'CYU', 'AFM 3', 'SAFETY AFM', 'VCG EDIT MODEL', 'VCG BASE CREATION', 'SMART REPLY', 'TA PROOFREAD 2.0', 'CYU TOPIC SUMM.', 'TA 0-1 COMPOSITION', 'CYU ACTION ITEMS', 'TA INTELLIGENT POLLS', 'TA SMART REPLY PRAC.', 'VCG ONEFORMA'] },
  { name: '🔵 Telus', columns: ['PR', 'GEOWORK TEST', 'ACCOUNT TYPE', 'SIM ACTIVATION', 'KYC VERIFY', 'PORTAL ONBOARD', 'CREDIT CHECK', 'SYSTEM ACCESS', 'TRAINING MODULE', 'FINAL REVIEW', 'NETWORK CONFIG'] },
  { name: '🟢 Data Annotation', columns: ['PR', 'ANNOTATION TASK', 'QA CHECK', 'LABEL REVIEW', 'DATA VALIDATION', 'MODEL FEEDBACK', 'BATCH SUBMITTED', 'ACCURACY CHECK', 'GUIDELINE CERT', 'CALIBRATION'] },
  { name: '🟠 Outlier', columns: ['PR', 'EVAL TASK', 'MODEL FEEDBACK', 'RED TEAMING', 'CREATIVE WRITING', 'CODE REVIEW', 'MATH TASK', 'REASONING TASK', 'MULTILINGUAL', 'SAFETY REVIEW'] },
  { name: '🩷 Mercor AI', columns: ['PR', 'PROFILE REVIEW', 'SKILL TEST', 'INTERVIEW', 'CONTRACT', 'ONBOARDING', 'FIRST TASK', 'FEEDBACK LOOP', 'RATING'] },
  { name: '🟡 Remotasks', columns: ['PR', 'QUIZ PASSED', 'TASK STARTED', 'ACCURACY', 'BATCHES DONE', 'LEVEL UP', 'BONUS TASK', 'QUALITY SCORE', 'PAYOUT LINKED'] },
  { name: '🔷 Appen', columns: ['PR', 'SCREENER TEST', 'PROJECT ACCESS', 'FIRST SUBMISSION', 'QA PASS', 'HOURS LOGGED', 'FEEDBACK DONE', 'PAYMENT METHOD', 'COMPLIANCE CERT'] },
  { name: '🔶 Clickworker', columns: ['PR', 'REGISTRATION', 'ASSESSMENT', 'FIRST JOB', 'QUALIFICATION', 'VERIFIED', 'PAYOUT SETUP', 'ACTIVE STATUS'] },
  { name: '⚫ Scale AI', columns: ['PR', 'ONBOARDING', 'TRAINING DONE', 'FIRST TASK', 'ACCURACY MET', 'TASKER LEVEL', 'PAYMENT SETUP', 'ACTIVE'] },
]

export interface HubPlatformDef {
  name: string
  base: string
}

export const HUB_PLATFORMS_DEF: HubPlatformDef[] = [
  { name: '🟣 Oneforma', base: 'Oneforma' },
  { name: '🔵 Telus', base: 'Telus' },
  { name: '🟢 Data Annotation', base: 'Data Annotation' },
  { name: '🟠 Outlier', base: 'Outlier' },
  { name: '🩷 Mercor AI', base: 'Mercor AI' },
]

export const LINKERS    = ['Linker A', 'Linker B', 'Linker C', 'Linker D', 'Self']
export const WARNINGS   = ['🟢 Clear', '🟡 Minor', '🔴 Serious', '⚫ Banned', '➖ None']
export const YN         = ['✅ Yes', '❌ No', '⏳ Pending', '🔄 In Progress', '➖ N/A']
export const ACCT_TYPES = ['Full-Time', 'Part-Time', 'Contractor', 'Intern', 'Freelance']
export const GEO        = ['✅ Passed', '❌ Failed', '⏳ Pending', '🔄 Retake', '⭕ Exempted']
export const ORD_STATUS = ['🟢 Active', '🟡 Pending', '🔵 Processing', '🔴 Issue', '⚫ Cancelled', '✅ Completed']
export const MONTHS     = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Build a tracker workbook in-memory (without writing to disk).
 */
export function buildTrackerWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  for (const s of TRACKER_SHEETS) {
    const headers = [
      '#', '👤 NAME', '🔗 LINKER', '👷 WORKERS NAME', '📧 EMAIL ADDRESS',
      '🍎 APPLE CONNECT PW', '🆔 PLATFORM ID', '💳 PAYONEER LINKED',
      '⚠️ WARNING', '📄 SOW', '📜 LE CERT.', ...s.columns,
    ]
    const data: string[][] = [headers]

    for (let i = 1; i <= 3; i++) {
      const name = `${s.name.split(' ').slice(1).join(' ')} Owner ${i}`
      const workerName = `Worker ${s.name.split(' ').slice(1).join(' ')} ${i}`
      const email = `worker_${i}_${s.name.split(' ').slice(1).join('_').toLowerCase()}@example.com`
      const row = [
        String(i), name, LINKERS[(i - 1) % LINKERS.length], workerName, email,
        `pw_${i}23`, `ID-CODE-${i}00`, YN[(i - 1) % YN.length],
        WARNINGS[(i - 1) % WARNINGS.length], YN[i % YN.length], YN[(i + 1) % YN.length],
        ...s.columns.map((_, idx) => YN[(idx + i) % YN.length]),
      ]
      data.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, s.name)
  }

  return wb
}

/**
 * Build a hub workbook in-memory (without writing to disk).
 */
export function buildHubWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  for (const p of HUB_PLATFORMS_DEF) {
    // Registry sheet
    const regHeaders = ['#', '📋 Project Task', '👤 Owner', '🏷 Account Type', '📧 Email', '🛂 Passport', '🌍 Geowork Test']
    const regData: string[][] = [regHeaders]
    for (let i = 1; i <= 3; i++) {
      regData.push([
        String(i), `Task-Model-${i}`, `Owner ${p.base} ${i}`,
        ACCT_TYPES[(i - 1) % ACCT_TYPES.length],
        `worker_${i}_${p.base.toLowerCase().replace(' ', '_')}@example.com`,
        `PASS-${i}2345`, GEO[(i - 1) % GEO.length],
      ])
    }
    const wsReg = XLSX.utils.aoa_to_sheet(regData)
    XLSX.utils.book_append_sheet(wb, wsReg, p.name)

    // Orders sheet
    const ordHeaders = ['Order ID', '🌐 Proxy', '👤 Owner', '🚦 Status', '💬 Notes']
    const ordData: string[][] = [ordHeaders]
    for (let i = 1; i <= 3; i++) {
      ordData.push([
        `ORD-${p.base.toUpperCase().slice(0, 3)}-00${i}`,
        `192.168.1.${10 + i}`, `Owner ${p.base} ${i}`,
        ORD_STATUS[(i - 1) % ORD_STATUS.length], `Notes for order ${i}`,
      ])
    }
    const wsOrd = XLSX.utils.aoa_to_sheet(ordData)
    XLSX.utils.book_append_sheet(wb, wsOrd, `${p.name} Orders`)

    // Payroll sheet
    const payHeaders = ['#', '🏦 Account', '👷 Worker', '% Task Completeness', '📆 Month', '✅ Tasks Done', '💵 Pay ($)', '💬 Notes']
    const payData: string[][] = [payHeaders]
    for (let i = 1; i <= 3; i++) {
      payData.push([
        String(i), `ACC-00${i}`, `Worker ${p.base} ${i}`, '100%',
        MONTHS[(i - 1) % MONTHS.length], String(20 + i * 5),
        String(250.00 + i * 75.50), `Payroll notes ${i}`,
      ])
    }
    const wsPay = XLSX.utils.aoa_to_sheet(payData)
    XLSX.utils.book_append_sheet(wb, wsPay, `${p.name} Payroll`)
  }

  return wb
}
