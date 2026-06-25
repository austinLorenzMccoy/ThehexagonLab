import { Lock } from 'lucide-react'

export function AccessDenied() {
  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
      <Lock className="mb-4 h-12 w-12 text-red-600 dark:text-red-400" />
      <h2 className="mb-2 text-xl font-semibold text-red-900 dark:text-red-100">
        Access Denied
      </h2>
      <p className="text-sm text-red-700 dark:text-red-300">
        You do not have permission to access this channel. Contact your administrator for access.
      </p>
    </div>
  )
}
