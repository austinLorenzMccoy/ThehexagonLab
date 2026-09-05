// Set by AuthProvider whenever a real, signed-in admin toggles demo preview
// on or off. Lets non-React data loaders (lib/db.ts) know whether to
// always return sample data instead of live results — so a preview can
// never leak real org data — without granting access to anything or
// deciding whether auth runs.
let previewActive = false
export const setDemoPreviewActive = (active: boolean): void => {
  previewActive = active
}
export const isDemoMode = (): boolean => previewActive
