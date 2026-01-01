'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { hoverScaleVariants } from './motion-variants'

interface AuthHeaderProps {
  authType: 'signin' | 'signup'
  brandName?: string
  brandHref?: string
}

export function AuthHeader({
  authType,
  brandName = 'EstateIQ',
  brandHref = '/',
}: AuthHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navCTA = {
    signin: { text: 'Create Account', href: '/signup' },
    signup: { text: 'Sign In', href: '/signin' },
  }

  return (
    <header className="relative z-10 mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between">
        {/* Brand Logo */}
        <motion.div {...hoverScaleVariants}>
          <Link
            href={brandHref}
            className="text-xl font-semibold text-zinc-900 dark:text-zinc-50"
          >
            {brandName}
          </Link>
        </motion.div>

        {/* Right side: Theme toggle + Nav CTA */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          {mounted && (
            <motion.button
              {...hoverScaleVariants}
              type="button"
              onClick={() => {
                const current = resolvedTheme || 'light'
                setTheme(current === 'dark' ? 'light' : 'dark')
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Toggle theme"
            >
              <Sun className="pointer-events-none absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="pointer-events-none absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </motion.button>
          )}

          {/* Nav CTA */}
          <motion.div {...hoverScaleVariants}>
            <Link
              href={navCTA[authType].href}
              className="rounded-md border border-zinc-300 bg-white/50 px-4 py-2 text-sm font-medium text-zinc-900 backdrop-blur-sm transition-colors hover:bg-white/80 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-50 dark:hover:bg-zinc-800/80"
            >
              {navCTA[authType].text}
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

