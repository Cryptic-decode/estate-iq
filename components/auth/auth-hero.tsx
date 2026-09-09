'use client'

import { motion } from 'framer-motion'
import { itemVariants } from './motion-variants'

interface AuthHeroProps {
  authType: 'signin' | 'signup'
  brandName?: string
}

const heroContent = {
  signin: {
    headline: 'Return to a clearer view of',
    supportingText:
      'Sign in to review rent obligations, record payments, manage follow-ups, and understand what needs attention next.',
  },
  signup: {
    headline: 'Bring your rent operations into',
    supportingText:
      'Create a workspace for your portfolio records, rent tracking, payment operations, follow-ups, and reporting.',
  },
}

export function AuthHero({ authType, brandName = 'EstateIQ' }: AuthHeroProps) {
  const content = heroContent[authType]

  return (
    <motion.div variants={itemVariants} className="max-w-xl space-y-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-brass">
        Rent operations, clearly managed
      </p>
      <h1 className="font-estate-serif text-4xl leading-tight tracking-[-0.035em] text-foreground sm:text-5xl">
        {content.headline}{' '}
        <span className="text-brand-brass">
          {brandName}
        </span>
      </h1>

      <p className="max-w-lg text-lg leading-8 text-muted-foreground">
        {content.supportingText}
      </p>
    </motion.div>
  )
}
