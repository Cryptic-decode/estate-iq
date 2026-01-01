'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  children: ReactNode
  variant?: 'signin' | 'signup'
}

export function AuthButton({
  loading = false,
  children,
  variant = 'signin',
  className = '',
  disabled,
  ...props
}: AuthButtonProps) {
  const buttonText = {
    signin: loading ? 'Signing in...' : 'Sign In',
    signup: loading ? 'Creating account...' : 'Create Account',
  }

  return (
    <motion.button
      type="submit"
      disabled={disabled || loading}
      className={`group relative h-11 w-full overflow-hidden rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-50 dark:text-zinc-900 sm:h-12 ${className}`}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {/* Gradient Overlay (slides in on hover) */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 dark:from-zinc-200 dark:via-zinc-100 dark:to-zinc-200"
        initial={{ x: '-100%', opacity: 0 }}
        whileHover={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{buttonText[variant]}</span>
          </>
        ) : (
          <>
            <motion.span
              className="flex items-center gap-2"
              whileHover={{ x: -5 }}
              transition={{ duration: 0.2 }}
            >
              <span>{children || buttonText[variant]}</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </motion.span>
          </>
        )}
      </div>
    </motion.button>
  )
}

