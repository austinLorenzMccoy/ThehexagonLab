'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  const applyTheme = useCallback((t: Theme) => {
    let resolved: 'light' | 'dark'
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      resolved = t
    }
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.classList.toggle('light', resolved === 'light')
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('wh-theme', t)
    applyTheme(t)
  }, [applyTheme])

  useEffect(() => {
    const saved = localStorage.getItem('wh-theme') as Theme | null
    const initial = saved ?? 'dark'
    setThemeState(initial)
    applyTheme(initial)

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
