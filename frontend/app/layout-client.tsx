'use client'

import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/lib/toast-context'
import { AppShell } from '@/components/shell/app-shell'

export function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
