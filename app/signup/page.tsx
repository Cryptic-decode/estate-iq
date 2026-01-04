'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthHero } from '@/components/auth/auth-hero'
import { AuthCard } from '@/components/auth/auth-card'
import { AnimatedAuthForm } from '@/components/auth/animated-auth-form'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate company name
    if (!companyName || companyName.trim().length === 0) {
      setError('Company name is required')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        data: {
          full_name: fullName || undefined,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Store company name in localStorage for onboarding
    if (typeof window !== 'undefined') {
      localStorage.setItem('estateiq_pending_company_name', companyName.trim())
    }

    // Email confirmation (recommended): show check-email screen.
    // After confirming, user can sign in and onboarding will prefill company name.
    router.push(`/signup/check-email?email=${encodeURIComponent(email.trim())}`)
    router.refresh()
  }

  return (
    <AuthLayout>
      <AuthHeader authType="signup" />
      <AuthContainer
        hero={<AuthHero authType="signup" />}
        form={
          <AuthCard
            title="Create Your Company Account"
            description="Set up your real estate company workspace and start managing rent intelligence"
          >
            <AnimatedAuthForm
              type="signup"
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              fullName={fullName}
              setFullName={setFullName}
              companyName={companyName}
              setCompanyName={setCompanyName}
              onSubmit={handleSignup}
              loading={loading}
              error={error}
            />
          </AuthCard>
        }
      />
    </AuthLayout>
  )
}
