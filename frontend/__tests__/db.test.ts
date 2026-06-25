import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// ── Import under test ───────────────────────────────────────────

import {
  fetchPlatforms, fetchPlatformTaskColumns, fetchPlatformStats,
  fetchTrackerByPlatform, updateTrackerField, updateTaskStatus,
  insertTrackerRow, deleteTrackerRow, fetchTaskHistory,
  fetchRegistryByPlatform, insertRegistryRow, updateRegistryRow,
  fetchOrdersByPlatform, createOrder, updateOrder, deleteOrder,
  fetchPayrollByPlatform, upsertPayrollRow,
  fetchAllUsers,
} from '@/lib/db'

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockResponse = { data: null, error: null }
  // Restore from() after any mockImplementation overrides
  mockSupabase.from = vi.fn(() => chain)
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

  it('applies linker filter', async () => {
    mockResponse = { data: [], error: null }
    await fetchTrackerByPlatform('oneforma', { linker: 'Linker A' })
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
