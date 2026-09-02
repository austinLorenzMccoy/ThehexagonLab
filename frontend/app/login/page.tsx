'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appUser, isLoading, isDemo, signInWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  // If already authenticated (or demo mode), redirect to dashboard
  useEffect(() => {
    if (!isLoading && appUser) {
      const next = searchParams.get('next') ?? '/dashboard'
      router.push(next)
    }
  }, [appUser, isLoading, router, searchParams])

  // Show OAuth error passed from callback redirect
  useEffect(() => {
    if (searchParams.get('error') === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError((err as Error).message)
      setSigningIn(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
      </div>
    )
  }

  // Demo mode: show a banner while redirecting
  if (isDemo && appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" />
          <p className="text-slate-400 text-sm">Entering demo mode…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 backdrop-blur p-8 shadow-2xl">
          {/* Logo + Title */}
          <div className="mb-8">
            <img src="/logo-full.png" alt="TheHexagon Labs" className="h-9 w-auto" />
            <p className="mt-2 text-xs text-slate-400">
              Intelligence Control Room
            </p>
          </div>

          {isDemo && (
            <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/10 p-3">
              <p className="text-sm text-violet-300">
                🎯 <strong>Demo Mode</strong> — Showing UI preview with sample data.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {signingIn ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {signingIn ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">
            Access is granted by your administrator after your first sign-in.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
