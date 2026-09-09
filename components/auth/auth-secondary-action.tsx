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
      <span className="text-muted-foreground">{action.text} </span>
      <motion.span {...hoverScaleVariants}>
        <Link
          href={href}
          className="font-medium text-foreground transition-colors hover:text-brand-brass hover:underline"
        >
          {action.linkText}
        </Link>
      </motion.span>
    </div>
  )
}
