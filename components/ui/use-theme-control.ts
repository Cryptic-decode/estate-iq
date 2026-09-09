'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'

const subscribe = () => () => undefined

export function useThemeControl() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  const isDark = mounted && resolvedTheme === 'dark'

  return {
    themeLabel: mounted
      ? isDark
        ? 'Use light theme'
        : 'Use dark theme'
      : 'Toggle color theme',
    themePressed: mounted ? isDark : undefined,
    toggleTheme: () => setTheme(isDark ? 'light' : 'dark'),
  }
}
