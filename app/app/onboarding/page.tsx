'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createOrganization } from '@/app/actions/organizations'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthHero } from '@/components/auth/auth-hero'
import { Input } from '@/components/ui/input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthErrorPanel } from '@/components/auth/auth-error-panel'
import { motion } from 'framer-motion'
import { itemVariants } from '@/components/auth/motion-variants'
import { CheckCircle2 } from 'lucide-react'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill company name from localStorage (set during signup)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingCompanyName = localStorage.getItem('estateiq_pending_company_name')
      if (pendingCompanyName) {
        setCompanyName(pendingCompanyName)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!companyName || companyName.trim().length === 0) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('companyName', companyName.trim())

    const result = await createOrganization(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Clear localStorage after successful org creation
      if (typeof window !== 'undefined') {
        localStorage.removeItem('estateiq_pending_company_name')
      }
      // Redirect happens in server action
    }
  }

  const onboardingHero = (
    <motion.div variants={itemVariants} className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-6xl">
        Complete your{' '}
        <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
          workspace setup
        </span>
      </h1>
      <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-xl lg:text-2xl lg:leading-relaxed">
        Your company workspace is almost ready. Confirm your company name and start managing rent intelligence in minutes.
      </p>

      {/* Quick Features */}
      <motion.div variants={itemVariants} className="mt-8 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Track rent payments
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Never miss a payment with automated tracking
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Automated reminders
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Send timely reminders to tenants automatically
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-zinc-600 dark:text-zinc-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Daily insights
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Get actionable intelligence on your portfolio
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  return (
    <AuthLayout>
      <AuthHeader authType="signup" />
      <AuthContainer
        hero={onboardingHero}
        form={
          <AuthCard
            title="Create Your Company"
            description="Confirm your company name to finish setting up EstateIQ"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Panel */}
              {error && <AuthErrorPanel error={error} />}

              {/* Company Name Input */}
              <Input
                label="Company Name"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Real Estate"
                disabled={loading}
                autoComplete="organization"
                className="h-11 text-base sm:h-12"
              />

              {/* Helper Text */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This will be your company name in EstateIQ. You can change it later in settings.
              </p>

              {/* Submit Button */}
              <AuthButton
                variant="signup"
                loading={loading}
                disabled={loading || !companyName.trim()}
              >
                {loading ? 'Creating company...' : 'Create company'}
              </AuthButton>
            </form>
          </AuthCard>
        }
      />
    </AuthLayout>
  )
}

