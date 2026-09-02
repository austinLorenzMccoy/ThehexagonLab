/**
 * Platform helpers — slug generation, validation, icon/color presets.
 */

export const PLATFORM_ICON_PRESETS = [
  '🟣', '🔵', '🟢', '🟠', '🩷', '🟡', '🔷', '🔶', '⚫', '🔴',
  '⚪', '🟤', '⭐', '🚀', '🧠', '📊', '🗺️', '🤖', '💼', '🌐',
] as const

export const PLATFORM_COLOR_PRESETS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F97316', '#EC4899',
  '#EAB308', '#0EA5E9', '#F59E0B', '#6B7280', '#EF4444',
  '#14B8A6', '#A855F7', '#6366F1', '#84CC16', '#F43F5E',
] as const

/** "TryRating Maps" → "tryrating_maps" */
export function slugifyPlatformLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48)
}

export function isValidPlatformSlug(slug: string): boolean {
  return /^[a-z][a-z0-9_]{0,47}$/.test(slug)
}

/** "QA CHECK" / "qa check" → "QA CHECK" for storage keys */
export function normalizeColumnKey(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, 64)
}

export interface PlatformUsage {
  tracker: number
  registry: number
  orders: number
  payroll: number
  onboarding: number
  columns: number
  active_columns: number
}

export function emptyUsage(): PlatformUsage {
  return {
    tracker: 0,
    registry: 0,
    orders: 0,
    payroll: 0,
    onboarding: 0,
    columns: 0,
    active_columns: 0,
  }
}

export function hasOperationalData(usage: PlatformUsage): boolean {
  return (
    usage.tracker + usage.registry + usage.orders + usage.payroll + usage.onboarding > 0
  )
}
