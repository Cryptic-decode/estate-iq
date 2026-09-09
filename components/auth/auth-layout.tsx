'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AuthLayoutProps {
  children: ReactNode
}

const pageVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(180,138,74,0.14),transparent_65%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(180,138,74,0.09),transparent_65%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 min-h-screen">{children}</div>
    </motion.div>
  )
}
