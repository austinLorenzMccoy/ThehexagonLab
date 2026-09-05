// Archived: demo mode used to auto-enable whenever Supabase env vars were
// missing/placeholder, which made it reachable from the real sign-in page.
// It now requires this explicit opt-in flag as well, so normal deployments
// (including ones that briefly lack Supabase config) never show a fake
// preview dashboard. Set NEXT_PUBLIC_ENABLE_DEMO=true to bring it back for
// client demos.
export const isDemoMode = () => {
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO !== 'true') return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === 'https://placeholder.supabase.co' || url.includes('placeholder')
}
