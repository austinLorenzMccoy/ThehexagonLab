import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock Supabase query builder ─────────────────────────────────

// Shared response that tests set before calling
let mockResponse: { data: any; error: any } = { data: null, error: null }

// Create a chainable object where every method returns itself
// and awaiting it resolves mockResponse
function createChain(): any {
  const chain: any = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === 'then') {
        return (onFulfilled: any) => Promise.resolve(mockResponse).then(onFulfilled)
      }
      if (prop === 'single') {
        return () => Promise.resolve({
          data: Array.isArray(mockResponse.data) ? mockResponse.data[0] : mockResponse.data,
          error: mockResponse.error,
        })
      }
      // All other methods return the chain itself
      return vi.fn(() => chain)
    },
  })
  return chain
}

const chain = createChain()
const mockSupabase = {
  from: vi.fn(() => chain),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

let demoModeActive = false

vi.mock('@/lib/demo', () => ({
  isDemoMode: () => demoModeActive,
}))

// ── Import under test ───────────────────────────────────────────

import {
  fetchPlatforms, fetchPlatformTaskColumns, fetchPlatformStats,
  fetchTrackerByPlatform, updateTrackerField, updateTaskStatus,
  insertTrackerRow, deleteTrackerRow, fetchTaskHistory, updateTrackerRow,
  fetchRegistryByPlatform, insertRegistryRow, updateRegistryRow,
  fetchOrdersByPlatform, createOrder, updateOrder, deleteOrder,
  fetchPayrollByPlatform, upsertPayrollRow,
  fetchAllUsers, provisionAccount,
  fetchMyTeamTracker, fetchMyTeamActivity,
  updatePartnerContact, updateReferral, deleteReferral,
  updatePaySlip, deletePaySlip, unmarkPaySlipPaid,
  fetchReferrerRevenueOverride, upsertReferrerRevenueOverride, resolveRevenueSplit,
} from '@/lib/db'

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockResponse = { data: null, error: null }
  demoModeActive = false
  // Restore from() after any mockImplementation overrides
  mockSupabase.from = vi.fn(() => chain)
})

// ── Demo preview ──────────────────────────────────────────────────
// See lib/demo.ts / lib/auth-context.tsx: an admin who toggles Preview
// Demo must never see real org data mixed in with the fake identity.

describe('demo preview fallbacks', () => {
  it('prefers sample data over real data while a real admin is previewing', async () => {
    demoModeActive = true
    mockResponse = { data: [{ id: 99, slug: 'real-live-platform' }], error: null }
    const result = await fetchPlatforms()
    expect(result.every((p: any) => p.slug !== 'real-live-platform')).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('prefers sample data over a real (non-empty) platform_stats result while previewing', async () => {
    demoModeActive = true
    mockResponse = {
      data: [{ platform_id: 99, platform_slug: 'real', total_workers: 500, total_orders: 500 }],
      error: null,
    }
    const result = await fetchPlatformStats()
    expect(result.some((r: any) => r.total_workers === 500)).toBe(false)
  })

  it('returns real data when not previewing, even though sample data exists', async () => {
    demoModeActive = false
    mockResponse = { data: [{ id: 1, slug: 'oneforma' }], error: null }
    const result = await fetchPlatforms()
    expect(result).toEqual([{ id: 1, slug: 'oneforma' }])
  })
})

// ── Platforms ───────────────────────────────────────────────────

describe('fetchPlatforms', () => {
  it('returns platforms on success', async () => {
    mockResponse = { data: [{ id: 1, slug: 'oneforma' }], error: null }
    const result = await fetchPlatforms()
    expect(result).toEqual([{ id: 1, slug: 'oneforma' }])
    expect(mockSupabase.from).toHaveBeenCalledWith('platforms')
  })

  it('returns empty array on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchPlatforms()
    expect(result).toEqual([])
    spy.mockRestore()
  })

  it('returns empty array when data is null with no error', async () => {
    mockResponse = { data: null, error: null }
    const result = await fetchPlatforms()
    expect(result).toEqual([])
  })
})

describe('fetchPlatformTaskColumns', () => {
  it('returns columns on success', async () => {
    mockResponse = { data: [{ id: 1, column_key: 'task1' }], error: null }
    const result = await fetchPlatformTaskColumns('oneforma')
    expect(result).toEqual([{ id: 1, column_key: 'task1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchPlatformTaskColumns('oneforma')
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

describe('fetchPlatformStats', () => {
  it('returns stats on success', async () => {
    mockResponse = { data: [{ platform_id: 1 }], error: null }
    const result = await fetchPlatformStats()
    expect(result).toEqual([{ platform_id: 1 }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchPlatformStats()
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

// ── Worker Tracker ──────────────────────────────────────────────

describe('fetchTrackerByPlatform', () => {
  it('returns tracker rows on success', async () => {
    mockResponse = { data: [{ id: 'r1' }], error: null }
    const result = await fetchTrackerByPlatform('oneforma')
    expect(result).toEqual([{ id: 'r1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchTrackerByPlatform('oneforma')
    expect(result).toEqual([])
    spy.mockRestore()
  })

  it('applies warningLevel filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchTrackerByPlatform('oneforma', { warningLevel: '🟢 Clear' })
    expect(mockSupabase.from).toHaveBeenCalledWith('worker_tracker')
  })

  it('applies manager filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchTrackerByPlatform('oneforma', { managerId: 'mgr-001' })
    expect(mockSupabase.from).toHaveBeenCalledWith('worker_tracker')
  })

  it('applies search filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchTrackerByPlatform('oneforma', { search: 'test' })
    expect(mockSupabase.from).toHaveBeenCalledWith('worker_tracker')
  })
})

describe('updateTrackerField', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updateTrackerField('r1', 'owner_name', 'New Name')
    expect(result).toEqual({ error: null })
  })

  it('returns error message on failure', async () => {
    mockResponse = { data: null, error: { message: 'update failed' } }
    const result = await updateTrackerField('r1', 'owner_name', 'New Name')
    expect(result).toEqual({ error: 'update failed' })
  })
})

describe('updateTaskStatus', () => {
  it('merges task status and returns null error on success', async () => {
    // First call reads existing, second call writes
    let callNum = 0
    mockSupabase.from.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        // Return a chain whose single() resolves with existing data
        return new Proxy({}, {
          get(_t, prop: string) {
            if (prop === 'single') return () => Promise.resolve({ data: { task_statuses: { T1: '✅ Yes' } }, error: null })
            return vi.fn(() => new Proxy({}, { get(_t2, p2: string) {
              if (p2 === 'single') return () => Promise.resolve({ data: { task_statuses: { T1: '✅ Yes' } }, error: null })
              return vi.fn(function() { return this })
            }}))
          },
        })
      }
      // Second call (update) - return thenable chain with success
      return new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (fn: any) => Promise.resolve({ data: null, error: null }).then(fn)
          return vi.fn(function() { return this })
        },
      })
    })
    const result = await updateTaskStatus('r1', 'T2', '❌ No')
    expect(result).toEqual({ error: null })
  })

  it('returns error when read fails', async () => {
    mockSupabase.from.mockImplementation(() => {
      return new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'single') return () => Promise.resolve({ data: null, error: { message: 'read fail' } })
          return vi.fn(function() { return this })
        },
      })
    })
    const result = await updateTaskStatus('r1', 'T1', '✅ Yes')
    expect(result).toEqual({ error: 'read fail' })
  })

  it('handles null existing task_statuses', async () => {
    let callNum = 0
    mockSupabase.from.mockImplementation(() => {
      callNum++
      if (callNum === 1) {
        return new Proxy({}, {
          get(_t, prop: string) {
            if (prop === 'single') return () => Promise.resolve({ data: { task_statuses: null }, error: null })
            return vi.fn(function() { return this })
          },
        })
      }
      return new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (fn: any) => Promise.resolve({ data: null, error: null }).then(fn)
          return vi.fn(function() { return this })
        },
      })
    })
    const result = await updateTaskStatus('r1', 'T1', '✅ Yes')
    expect(result).toEqual({ error: null })
  })
})

describe('insertTrackerRow', () => {
  it('returns id on success', async () => {
    mockResponse = { data: { id: 'new-id' }, error: null }
    const result = await insertTrackerRow({} as any)
    expect(result).toEqual({ id: 'new-id', error: null })
  })

  it('returns null id on error', async () => {
    mockResponse = { data: null, error: { message: 'insert fail' } }
    const result = await insertTrackerRow({} as any)
    expect(result).toEqual({ id: null, error: 'insert fail' })
  })
})

describe('deleteTrackerRow', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await deleteTrackerRow('r1')
    expect(result).toEqual({ error: null })
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'del fail' } }
    const result = await deleteTrackerRow('r1')
    expect(result).toEqual({ error: 'del fail' })
  })
})

describe('fetchTaskHistory', () => {
  it('returns history rows', async () => {
    mockResponse = { data: [{ id: 'h1' }], error: null }
    const result = await fetchTaskHistory('r1')
    expect(result).toEqual([{ id: 'h1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchTaskHistory('r1')
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

// ── Workers Registry ────────────────────────────────────────────

describe('fetchRegistryByPlatform', () => {
  it('returns registry rows', async () => {
    mockResponse = { data: [{ id: 'reg1' }], error: null }
    const result = await fetchRegistryByPlatform('oneforma')
    expect(result).toEqual([{ id: 'reg1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchRegistryByPlatform('oneforma')
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

describe('insertRegistryRow', () => {
  it('returns id on success', async () => {
    mockResponse = { data: { id: 'new-reg' }, error: null }
    const result = await insertRegistryRow({} as any)
    expect(result).toEqual({ id: 'new-reg', error: null })
  })

  it('returns null id on error', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await insertRegistryRow({} as any)
    expect(result).toEqual({ id: null, error: 'fail' })
  })
})

describe('updateRegistryRow', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updateRegistryRow('r1', { owner_name: 'New' } as any)
    expect(result).toEqual({ error: null })
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updateRegistryRow('r1', {} as any)
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Orders ──────────────────────────────────────────────────────

describe('fetchOrdersByPlatform', () => {
  it('returns orders', async () => {
    mockResponse = { data: [{ id: 'ord1' }], error: null }
    const result = await fetchOrdersByPlatform('oneforma')
    expect(result).toEqual([{ id: 'ord1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchOrdersByPlatform('oneforma')
    expect(result).toEqual([])
    spy.mockRestore()
  })

  it('applies status filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchOrdersByPlatform('oneforma', '🟢 Active')
    expect(mockSupabase.from).toHaveBeenCalledWith('orders')
  })
})

describe('createOrder', () => {
  it('returns order on success', async () => {
    mockResponse = { data: { id: 'new-ord' }, error: null }
    const result = await createOrder({} as any)
    expect(result.order).toEqual({ id: 'new-ord' })
    expect(result.error).toBeNull()
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await createOrder({} as any)
    expect(result.error).toBe('fail')
  })
})

describe('updateOrder', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updateOrder('ord1', { status: '🟢 Active' })
    expect(result).toEqual({ error: null })
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updateOrder('ord1', {})
    expect(result).toEqual({ error: 'fail' })
  })
})

describe('deleteOrder', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await deleteOrder('ord1')
    expect(result).toEqual({ error: null })
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await deleteOrder('ord1')
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Payroll ─────────────────────────────────────────────────────

describe('fetchPayrollByPlatform', () => {
  it('returns payroll rows', async () => {
    mockResponse = { data: [{ id: 'p1' }], error: null }
    const result = await fetchPayrollByPlatform('oneforma')
    expect(result).toEqual([{ id: 'p1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchPayrollByPlatform('oneforma')
    expect(result).toEqual([])
    spy.mockRestore()
  })

  it('applies year filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchPayrollByPlatform('oneforma', 2025)
    expect(mockSupabase.from).toHaveBeenCalledWith('payroll')
  })

  it('applies month filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchPayrollByPlatform('oneforma', undefined, 'January')
    expect(mockSupabase.from).toHaveBeenCalledWith('payroll')
  })
})

describe('upsertPayrollRow', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await upsertPayrollRow({} as any)
    expect(result).toEqual({ error: null })
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await upsertPayrollRow({} as any)
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Admin ───────────────────────────────────────────────────────

describe('fetchAllUsers', () => {
  it('returns users', async () => {
    mockResponse = { data: [{ id: 'u1' }], error: null }
    const result = await fetchAllUsers()
    expect(result).toEqual([{ id: 'u1' }])
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchAllUsers()
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

// ── Tracker — Edit modal / My Team ──────────────────────────────

describe('updateTrackerRow', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updateTrackerRow('r1', { notes: 'updated' } as any)
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('worker_tracker')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updateTrackerRow('r1', {} as any)
    expect(result).toEqual({ error: 'fail' })
  })
})

describe('fetchMyTeamTracker', () => {
  it('returns tracker rows scoped to the manager', async () => {
    mockResponse = { data: [{ id: 'r1', manager_id: 'mgr1' }], error: null }
    const result = await fetchMyTeamTracker('mgr1')
    expect(result).toEqual([{ id: 'r1', manager_id: 'mgr1' }])
    expect(mockSupabase.from).toHaveBeenCalledWith('worker_tracker')
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchMyTeamTracker('mgr1')
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

describe('fetchMyTeamActivity', () => {
  it('returns activity rows scoped to the manager team', async () => {
    mockResponse = { data: [{ id: 'h1' }], error: null }
    const result = await fetchMyTeamActivity('mgr1')
    expect(result).toEqual([{ id: 'h1' }])
    expect(mockSupabase.from).toHaveBeenCalledWith('task_status_history')
  })

  it('returns empty on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchMyTeamActivity('mgr1', 10)
    expect(result).toEqual([])
    spy.mockRestore()
  })
})

// ── Referrals ────────────────────────────────────────────────────

describe('updateReferral', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updateReferral('ref1', { referred_name: 'New Name' })
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('referrals')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updateReferral('ref1', {})
    expect(result).toEqual({ error: 'fail' })
  })
})

describe('deleteReferral', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await deleteReferral('ref1')
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('referrals')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await deleteReferral('ref1')
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Partner Contacts ─────────────────────────────────────────────

describe('updatePartnerContact', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await updatePartnerContact('c1', { name: 'New Name' })
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('partner_contacts')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updatePartnerContact('c1', {})
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Pay Slips — edit/delete/unmark paid ─────────────────────────

describe('updatePaySlip', () => {
  it('returns null error on success without logging audit when no actor given', async () => {
    mockResponse = { data: null, error: null }
    const result = await updatePaySlip('ps1', { notes: 'fixed amount' })
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('pay_slips')
    expect(mockSupabase.from).not.toHaveBeenCalledWith('audit_log')
  })

  it('logs an audit entry when updatedBy is given', async () => {
    mockResponse = { data: null, error: null }
    await updatePaySlip('ps1', { notes: 'fixed amount' }, 'admin1')
    expect(mockSupabase.from).toHaveBeenCalledWith('pay_slips')
    expect(mockSupabase.from).toHaveBeenCalledWith('audit_log')
  })

  it('does not log audit when the update fails', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await updatePaySlip('ps1', {}, 'admin1')
    expect(result).toEqual({ error: 'fail' })
    expect(mockSupabase.from).not.toHaveBeenCalledWith('audit_log')
  })
})

describe('deletePaySlip', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await deletePaySlip('ps1')
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('pay_slips')
  })

  it('logs an audit entry when deletedBy is given', async () => {
    mockResponse = { data: null, error: null }
    await deletePaySlip('ps1', 'admin1')
    expect(mockSupabase.from).toHaveBeenCalledWith('audit_log')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await deletePaySlip('ps1')
    expect(result).toEqual({ error: 'fail' })
  })
})

describe('unmarkPaySlipPaid', () => {
  it('deletes the active payment row and returns null error', async () => {
    mockResponse = { data: null, error: null }
    const result = await unmarkPaySlipPaid('ps1')
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('payments')
  })

  it('logs an audit entry when actorId is given', async () => {
    mockResponse = { data: null, error: null }
    await unmarkPaySlipPaid('ps1', 'admin1')
    expect(mockSupabase.from).toHaveBeenCalledWith('audit_log')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await unmarkPaySlipPaid('ps1')
    expect(result).toEqual({ error: 'fail' })
  })
})

// ── Referrer revenue overrides ───────────────────────────────────

describe('fetchReferrerRevenueOverride', () => {
  it('returns the override row', async () => {
    mockResponse = { data: { referrer_user_id: 'ref1', referral_percentage: 15 }, error: null }
    const result = await fetchReferrerRevenueOverride('ref1')
    expect(result).toEqual({ referrer_user_id: 'ref1', referral_percentage: 15 })
  })

  it('returns null on error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await fetchReferrerRevenueOverride('ref1')
    expect(result).toBeNull()
    spy.mockRestore()
  })
})

describe('upsertReferrerRevenueOverride', () => {
  it('returns null error on success', async () => {
    mockResponse = { data: null, error: null }
    const result = await upsertReferrerRevenueOverride({ referrer_user_id: 'ref1', referral_percentage: 15 })
    expect(result).toEqual({ error: null })
    expect(mockSupabase.from).toHaveBeenCalledWith('referrer_revenue_overrides')
  })

  it('returns error on failure', async () => {
    mockResponse = { data: null, error: { message: 'fail' } }
    const result = await upsertReferrerRevenueOverride({ referrer_user_id: 'ref1', referral_percentage: 15 })
    expect(result).toEqual({ error: 'fail' })
  })
})

describe('resolveRevenueSplit', () => {
  // resolveRevenueSplit fires 4 parallel .from() calls (platform,
  // worker, referral, referrer) — branch the mock per table so each
  // can be given an independent maybeSingle() response.
  function mockByTable(responses: Record<string, any>) {
    mockSupabase.from = vi.fn((table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: responses[table] ?? null, error: null }),
        }),
      }),
    })) as any
  }

  it('falls back to platform default when no overrides exist', async () => {
    mockByTable({
      platform_revenue_splits: { client_percentage: 40, company_percentage: 30, referral_percentage: 10, worker_percentage: 20 },
    })
    const result = await resolveRevenueSplit('w1', 1)
    expect(result).toEqual({ client_percentage: 40, company_percentage: 30, referral_percentage: 10, worker_percentage: 20 })
  })

  it('worker override wins over platform default for client/company/worker %', async () => {
    mockByTable({
      platform_revenue_splits: { client_percentage: 40, company_percentage: 30, referral_percentage: 10, worker_percentage: 20 },
      worker_revenue_overrides: { client_percentage: 35, company_percentage: 25, worker_percentage: 30 },
    })
    const result = await resolveRevenueSplit('w1', 1)
    expect(result.client_percentage).toBe(35)
    expect(result.company_percentage).toBe(25)
    expect(result.worker_percentage).toBe(30)
  })

  it('referrer default wins over platform default for referral %', async () => {
    mockByTable({
      platform_revenue_splits: { client_percentage: 40, company_percentage: 30, referral_percentage: 10, worker_percentage: 20 },
      referrer_revenue_overrides: { referral_percentage: 18 },
    })
    const result = await resolveRevenueSplit('w1', 1, null, 'referrer1')
    expect(result.referral_percentage).toBe(18)
  })

  it('per-referral override wins over the referrer default', async () => {
    mockByTable({
      platform_revenue_splits: { client_percentage: 40, company_percentage: 30, referral_percentage: 10, worker_percentage: 20 },
      referrer_revenue_overrides: { referral_percentage: 18 },
      referral_revenue_overrides: { referral_percentage: 25 },
    })
    const result = await resolveRevenueSplit('w1', 1, 'referral1', 'referrer1')
    expect(result.referral_percentage).toBe(25)
  })

  it('resolves to 0/derived worker % when nothing is configured at all', async () => {
    mockByTable({})
    const result = await resolveRevenueSplit('w1', null)
    expect(result).toEqual({ client_percentage: 0, company_percentage: 0, referral_percentage: 0, worker_percentage: 100 })
  })
})

// ── Account provisioning (fetch-based, not Supabase) ─────────────

describe('provisionAccount', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the new userId on success', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, json: () => Promise.resolve({ userId: 'new-user-id' }),
    })) as any
    const result = await provisionAccount('new@example.com', 'New Worker')
    expect(result).toEqual({ userId: 'new-user-id', error: null })
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', displayName: 'New Worker' }),
    })
  })

  it('returns the server error message on failure', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false, json: () => Promise.resolve({ error: 'An account with this email already exists' }),
    })) as any
    const result = await provisionAccount('dup@example.com')
    expect(result).toEqual({ userId: null, error: 'An account with this email already exists' })
  })

  it('falls back to a generic error when the response has no body', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: false, json: () => Promise.reject(new Error('no body')),
    })) as any
    const result = await provisionAccount('bad@example.com')
    expect(result).toEqual({ userId: null, error: 'Could not create account' })
  })
})
