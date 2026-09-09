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
    <div className="w-full rounded-2xl border border-border bg-card p-7 text-card-foreground shadow-xl shadow-[#123a32]/8 dark:shadow-black/20 sm:p-9">
      <motion.div
        variants={springScaleVariants}
        initial="initial"
        animate="animate"
        className="mb-8"
      >
        <h2 className="font-estate-serif text-3xl tracking-tight text-card-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </motion.div>

      <div>{children}</div>
    </div>
  )
}
