'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
      // Small delay to ensure animation completes before focusing
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus()
      }, 100)
      return () => {
        clearTimeout(timer)
        previouslyFocusedRef.current?.focus()
      }
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !loading) {
        onClose()
      }
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleTab)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleTab)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose])

  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleOverlayClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#07100d]/60 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-2xl dark:shadow-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
          >
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-start gap-4">
                {variant === 'destructive' && (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3
                    id="confirm-dialog-title"
                    className="text-lg font-semibold text-card-foreground"
                  >
                    {title}
                  </h3>
                  <p
                    id="confirm-dialog-description"
                    className="mt-2 text-sm text-muted-foreground"
                  >
                    {description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
                <Button
                  ref={confirmButtonRef}
                  variant={variant === 'destructive' ? 'primary' : 'primary'}
                  size="md"
                  onClick={handleConfirm}
                  disabled={loading}
                  className={
                    variant === 'destructive'
                      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700'
                      : ''
                  }
                >
                  {loading ? 'Processing...' : confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
