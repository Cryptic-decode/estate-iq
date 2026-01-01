'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { hoverScaleVariants } from './motion-variants'

interface AuthSecondaryActionProps {
  authType: 'signin' | 'signup'
  signinHref?: string
  signupHref?: string
}

const secondaryActions = {
  signin: {
    text: "Don't have an account?",
    linkText: 'Create one here',
    href: '/signup',
  },
  signup: {
    text: 'Already have an account?',
    linkText: 'Sign in here',
    href: '/signin',
  },
}

export function AuthSecondaryAction({
  authType,
  signinHref = '/signin',
  signupHref = '/signup',
}: AuthSecondaryActionProps) {
  const action = secondaryActions[authType]
  const href = authType === 'signin' ? signupHref : signinHref

  return (
    <div className="text-center text-sm">
      <span className="text-zinc-600 dark:text-zinc-400">{action.text} </span>
      <motion.span {...hoverScaleVariants}>
        <Link
          href={href}
          className="font-medium text-zinc-900 transition-colors hover:text-zinc-700 hover:underline dark:text-zinc-50 dark:hover:text-zinc-200"
        >
          {action.linkText}
        </Link>
      </motion.span>
    </div>
  )
}

