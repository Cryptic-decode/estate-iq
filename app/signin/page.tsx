'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthHeader } from '@/components/auth/auth-header'
import { AuthContainer } from '@/components/auth/auth-container'
import { AuthHero } from '@/components/auth/auth-hero'
import { AuthCard } from '@/components/auth/auth-card'
import { AnimatedAuthForm } from '@/components/auth/animated-auth-form'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = (searchParams.get('email') ?? '').trim()
  const [email, setEmail] = useState(emailFromQuery)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const redirectTo = searchParams.get('redirectTo') || '/app'
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <AuthCard
      title="Welcome Back"
      description="Sign in to continue managing your rent intelligence"
    >
      <AnimatedAuthForm
        type="signin"
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleSignIn}
        loading={loading}
        error={error}
      />
    </AuthCard>
  )
}

export default function SignInPage() {
  return (
    <AuthLayout>
      <AuthHeader authType="signin" />
      <AuthContainer
        hero={<AuthHero authType="signin" />}
        form={
          <Suspense fallback={
            <AuthCard
              title="Welcome Back"
              description="Sign in to continue managing your rent intelligence"
            >
              <div className="h-64" />
            </AuthCard>
          }>
            <SignInForm />
          </Suspense>
        }
      />
    </AuthLayout>
  )
}
