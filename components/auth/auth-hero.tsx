'use client'

import { motion } from 'framer-motion'
import { itemVariants } from './motion-variants'

interface AuthHeroProps {
  authType: 'signin' | 'signup'
  brandName?: string
}

const heroContent = {
  signin: {
    headline: 'Welcome back to',
    supportingText:
      'Sign in to continue managing your rent intelligence. Track payments, send reminders, and stay on top of your portfolio.',
  },
  signup: {
    headline: 'Start managing your rent portfolio with',
    supportingText:
      'Built for real estate companies. Track every payment, automate reminders, and get daily rent intelligence—all in one workspace.',
  },
}

export function AuthHero({ authType, brandName = 'EstateIQ' }: AuthHeroProps) {
  const content = heroContent[authType]

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {/* Headline */}
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
        {content.headline}{' '}
        <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
          {brandName}
        </span>
      </h1>

      {/* Supporting Paragraph */}
      <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-xl lg:text-2xl lg:leading-relaxed">
        {content.supportingText}
      </p>
    </motion.div>
  )
}

