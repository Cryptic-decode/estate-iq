'use client'

import Link from 'next/link'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { hoverScaleVariants } from './motion-variants'
import { EstateIQLogo } from '@/components/brand/estate-iq-logo'
import { useThemeControl } from '@/components/ui/use-theme-control'

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
  const { themeLabel, themePressed, toggleTheme } = useThemeControl()

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
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b48a4a]"
          >
            {brandName === 'EstateIQ' ? <EstateIQLogo compact /> : brandName}
          </Link>
        </motion.div>

        {/* Right side: Theme toggle + Nav CTA */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <motion.button
            {...hoverScaleVariants}
            type="button"
            onClick={toggleTheme}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={themeLabel}
            aria-pressed={themePressed}
          >
            <Sun className="pointer-events-none absolute h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="pointer-events-none absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </motion.button>

          {/* Nav CTA */}
          <motion.div {...hoverScaleVariants}>
            <Link
              href={navCTA[authType].href}
              className="rounded-md border border-border bg-card/70 px-4 py-2 text-sm font-medium text-card-foreground backdrop-blur-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {navCTA[authType].text}
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  )
}
