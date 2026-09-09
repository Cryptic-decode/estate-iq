'use client'

import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { motion, HTMLMotionProps } from 'framer-motion'

interface AuthButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
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
      className={`group relative h-11 w-full rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:h-12 ${className}`}
      whileHover={!disabled && !loading ? { y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{buttonText[variant]}</span>
          </>
        ) : (
          <>
            <span>{children || buttonText[variant]}</span>
          </>
        )}
      </div>
    </motion.button>
  )
}
