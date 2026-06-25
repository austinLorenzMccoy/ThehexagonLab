import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: [
        'types/index.ts',
        'lib/supabase/client.ts',
        'lib/supabase/server.ts',
        'lib/db.ts',
        'lib/auth-context.tsx',
        'middleware.ts',
        'app/api/admin/users/route.ts',
        'app/api/export/[table]/route.ts',
        'app/api/tracker/task/route.ts',
        'app/auth/callback/route.ts',
      ],
      thresholds: {
        statements: 100,
        branches: 95,
        functions: 100,
        lines: 100,
      },
    },
  },
})
