import { describe, it, expect } from 'vitest'
import { getPermissions, type AppUser, type UserRole } from '@/types'

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'u1',
    email: 'test@test.com',
    display_name: 'Test',
    role: 'worker',
    platform_access: null,
    worker_id: null,
    can_view_orders: false,
    is_active: true,
    last_sign_in: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  }
}

describe('getPermissions', () => {
  it('returns full admin permissions', () => {
    const p = getPermissions(makeUser({ role: 'admin' }))
    expect(p.canViewAllPlatforms).toBe(true)
    expect(p.canEditWorkers).toBe(true)
    expect(p.canViewOrders).toBe(true)
    expect(p.canEditOrders).toBe(true)
    expect(p.canViewPayroll).toBe(true)
    expect(p.canManageRoles).toBe(true)
    expect(p.canExport).toBe(true)
  })

  it('returns manager permissions', () => {
    const p = getPermissions(makeUser({ role: 'manager' }))
    expect(p.canViewAllPlatforms).toBe(false)
    expect(p.canEditWorkers).toBe(true)
    expect(p.canViewOrders).toBe(false) // can_view_orders is false
    expect(p.canEditOrders).toBe(false)
    expect(p.canViewPayroll).toBe(true)
    expect(p.canManageRoles).toBe(false)
    expect(p.canExport).toBe(true)
  })

  it('returns manager with order access when can_view_orders is true', () => {
    const p = getPermissions(makeUser({ role: 'manager', can_view_orders: true }))
    expect(p.canViewOrders).toBe(true)
  })

  it('returns supervisor permissions', () => {
    const p = getPermissions(makeUser({ role: 'supervisor' }))
    expect(p.canViewAllPlatforms).toBe(false)
    expect(p.canEditWorkers).toBe(true)
    expect(p.canViewOrders).toBe(false)
    expect(p.canEditOrders).toBe(false)
    expect(p.canViewPayroll).toBe(false)
    expect(p.canManageRoles).toBe(false)
    expect(p.canExport).toBe(false)
  })

  it('returns supervisor with order access when can_view_orders is true', () => {
    const p = getPermissions(makeUser({ role: 'supervisor', can_view_orders: true }))
    expect(p.canViewOrders).toBe(true)
  })

  it('returns worker permissions (most restricted)', () => {
    const p = getPermissions(makeUser({ role: 'worker' }))
    expect(p.canViewAllPlatforms).toBe(false)
    expect(p.canEditWorkers).toBe(false)
    expect(p.canViewOrders).toBe(false)
    expect(p.canEditOrders).toBe(false)
    expect(p.canViewPayroll).toBe(false)
    expect(p.canManageRoles).toBe(false)
    expect(p.canExport).toBe(false)
  })

  it('worker with can_view_orders still gets order access', () => {
    const p = getPermissions(makeUser({ role: 'worker', can_view_orders: true }))
    expect(p.canViewOrders).toBe(true)
  })

  it('preserves assignedPlatforms from user', () => {
    const platforms = ['oneforma', 'telus']
    const p = getPermissions(makeUser({ platform_access: platforms }))
    expect(p.assignedPlatforms).toEqual(platforms)
  })

  it('returns null assignedPlatforms for admin (admin has null)', () => {
    const p = getPermissions(makeUser({ role: 'admin', platform_access: null }))
    expect(p.assignedPlatforms).toBeNull()
  })

  it('tests all 4 roles against canEditWorkers', () => {
    const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'worker']
    const expected = [true, true, true, false]
    roles.forEach((role, i) => {
      expect(getPermissions(makeUser({ role })).canEditWorkers).toBe(expected[i])
    })
  })

  it('tests all 4 roles against canViewPayroll', () => {
    const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'worker']
    const expected = [true, true, false, false]
    roles.forEach((role, i) => {
      expect(getPermissions(makeUser({ role })).canViewPayroll).toBe(expected[i])
    })
  })

  it('tests all 4 roles against canExport', () => {
    const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'worker']
    const expected = [true, true, false, false]
    roles.forEach((role, i) => {
      expect(getPermissions(makeUser({ role })).canExport).toBe(expected[i])
    })
  })
})
