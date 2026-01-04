'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthHero } from '@/components/auth/auth-hero'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthButton } from '@/components/auth/auth-button'
import { motion } from 'framer-motion'
import { itemVariants } from '@/components/auth/motion-variants'

function CheckEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = (searchParams.get('email') ?? '').trim()

  return (
    <AuthLayout>
      <AuthHeader authType="signup" />
      <AuthContainer
        hero={<AuthHero authType="signup" />}
        form={
          <AuthCard
            title="Confirm your email"
            description="We’ve sent you a confirmation link. Confirm your email to activate your account (you’ll be redirected back to EstateIQ)."
          >
            <motion.div variants={itemVariants} className="space-y-6">
              {email ? (
                <div className="rounded-lg border border-zinc-200 bg-white/60 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
                  Confirmation sent to: <span className="font-medium">{email}</span>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Check your inbox for a confirmation link.
                </p>
              )}

              <div className="space-y-3">
                <AuthButton
                  variant="signin"
                  type="button"
                  onClick={() => {
                    const next = email
                      ? `/signin?email=${encodeURIComponent(email)}`
                      : '/signin'
                    router.push(next)
                  }}
                >
                  I’ve confirmed my email — Sign in
                </AuthButton>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  After you sign in, we’ll prompt you to create your company (onboarding).
                </p>
              </div>
            </motion.div>
          </AuthCard>
        }
      />
    </AuthLayout>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <AuthHeader authType="signup" />
          <AuthContainer
            hero={<AuthHero authType="signup" />}
            form={
              <AuthCard
                title="Confirm your email"
                description="We’ve sent you a confirmation link."
              >
                <div className="h-40" />
              </AuthCard>
            }
          />
        </AuthLayout>
      }
    >
      <CheckEmailContent />
    </Suspense>
  )
}


