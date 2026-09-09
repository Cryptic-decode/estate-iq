'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { itemVariants } from './motion-variants'

interface AuthContainerProps {
  hero: ReactNode
  form: ReactNode
  features?: ReactNode
}

export function AuthContainer({ hero, form, features }: AuthContainerProps) {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none sm:px-6 lg:py-14">
      {/* Mobile Layout: Vertical Stack */}
      <div className="flex flex-col gap-8 lg:hidden">
        <motion.div variants={itemVariants}>{hero}</motion.div>
        <motion.div variants={itemVariants}>{form}</motion.div>
        {features && <motion.div variants={itemVariants}>{features}</motion.div>}
      </div>

      {/* Desktop Layout: Two-Column Grid */}
      <div className="hidden lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        {/* Left Column: Hero + Features */}
        <motion.div variants={itemVariants} className="flex flex-col gap-8">
          {hero}
          {features}
        </motion.div>

        {/* Right Column: Form Card (Centered) */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center"
        >
          <div className="w-full max-w-md">{form}</div>
        </motion.div>
      </div>
    </main>
  )
}
