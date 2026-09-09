'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createOrganization } from '@/app/actions/organizations'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { AuthButton } from '@/components/auth/auth-button'
import { motion } from 'framer-motion'
import { itemVariants } from '@/components/auth/motion-variants'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)

  // Prefill company name from localStorage (set during signup)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingCompanyName = localStorage.getItem('estateiq_pending_company_name')
      if (!pendingCompanyName) return

      const frame = window.requestAnimationFrame(() => setCompanyName(pendingCompanyName))
      return () => window.cancelAnimationFrame(frame)
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (!companyName || companyName.trim().length === 0) {
      toast.error('Unable to create company', {
        description: 'Company name is required.',
      })
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('companyName', companyName.trim())

    const result = await createOrganization(formData)

    if (result?.error) {
      toast.error('Unable to create company', {
        description: result.error,
      })
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-brass">
        One final step
      </p>
      <h1 className="font-estate-serif text-4xl leading-tight tracking-[-0.035em] text-foreground sm:text-5xl">
        Complete your <span className="text-brand-brass">workspace setup.</span>
      </h1>
      <p className="max-w-lg text-lg leading-8 text-muted-foreground">
        Confirm your company name, then begin setting up the portfolio your team will manage.
      </p>

      <motion.div variants={itemVariants} className="mt-8 divide-y divide-border border-y border-border">
        <div className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
          <span className="font-estate-serif text-brand-brass">01</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Track rent payments
            </p>
            <p className="text-sm text-muted-foreground">
              Never miss a payment with automated tracking
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
          <span className="font-estate-serif text-brand-brass">02</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Structured follow-ups
            </p>
            <p className="text-sm text-muted-foreground">
              Prioritize due and overdue rent with clear next actions
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[2.5rem_1fr] gap-3 py-4">
          <span className="font-estate-serif text-brand-brass">03</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Daily insights
            </p>
            <p className="text-sm text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
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
