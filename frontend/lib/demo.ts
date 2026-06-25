// Returns true when Supabase is not configured (no env vars or placeholder values)
// Used to enable demo mode for client previews
export const isDemoMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !url || url === 'https://placeholder.supabase.co' || url.includes('placeholder')
}
