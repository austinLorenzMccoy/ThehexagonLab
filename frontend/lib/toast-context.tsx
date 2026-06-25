'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = t.type === 'success' ? CheckCircle : t.type === 'error' ? AlertCircle : Info
          const colorClass =
            t.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
              : t.type === 'error'
                ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'

          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 ${colorClass}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="p-0.5 rounded hover:bg-white/10">
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
