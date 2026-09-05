// Demo preview no longer bypasses real sign-in for anyone. This flag only
// controls whether the "Preview Demo" toggle exists at all in a given
// deployment; actually flipping it still requires a real, authenticated
// admin (see auth-context.tsx). Set NEXT_PUBLIC_ENABLE_DEMO=true to offer
// the toggle to admins, e.g. for client demos or screenshots.
export const isDemoPreviewEnabled = () => process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true'
