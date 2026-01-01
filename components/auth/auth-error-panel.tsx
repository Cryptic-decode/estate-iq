'use client'

import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface AuthErrorPanelProps {
  error: string
}

export function AuthErrorPanel({ error }: AuthErrorPanelProps) {
  if (!error) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
    </motion.div>
  )
}

