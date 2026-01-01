'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { springScaleVariants } from './motion-variants'

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full rounded-2xl border-0 bg-white/80 p-8 shadow-2xl backdrop-blur-sm dark:bg-zinc-800/80 sm:p-10">
      {/* Card Header */}
      <motion.div
        variants={springScaleVariants}
        initial="initial"
        animate="animate"
        className="mb-8 text-center"
      >
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </motion.div>

      {/* Card Content */}
      <div>{children}</div>
    </div>
  )
}

