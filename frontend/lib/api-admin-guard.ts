/**
 * lib/api-admin-guard.ts — shared admin-only API route guards.
 *
 * Every admin-only route needs the same two checks: is this request in
 * demo-preview mode, and is the caller actually role='admin'. Centralized
 * here so a future change to either check (e.g. also requiring
 * is_active) only needs to happen once.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function isDemoPreview() {
  const jar = await cookies()
  return jar.get('wh_demo')?.value === '1'
}

export async function assertAdmin(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  return (data as { role?: string } | null)?.role === 'admin' ? user : null
}

/**
 * Admin or manager — used only by routes managers are allowed to call
 * (currently /api/payments/process, since managers now manage Pay
 * Slips). Every other admin-only route should keep using assertAdmin().
 */
export async function assertAdminOrManager(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  const role = (data as { role?: string } | null)?.role
  return role === 'admin' || role === 'manager' ? user : null
}
