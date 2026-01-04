'use client'

import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { PasswordInput } from './password-input'
import { AuthButton } from './auth-button'
import { AuthErrorPanel } from './auth-error-panel'
import { AuthSecondaryAction } from './auth-secondary-action'

interface AnimatedAuthFormProps {
  type: 'signin' | 'signup'
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  fullName?: string
  setFullName?: (name: string) => void
  companyName?: string
  setCompanyName?: (name: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  loading: boolean
  error?: string | null
}

export function AnimatedAuthForm({
  type,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  companyName,
  setCompanyName,
  onSubmit,
  loading,
  error,
}: AnimatedAuthFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit(e)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Panel */}
      {error && <AuthErrorPanel error={error} />}

      {/* Signup-only: Full Name and Company Name (2-column grid) */}
      {type === 'signup' && setFullName && setCompanyName && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            required
            value={fullName || ''}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={loading}
            autoComplete="name"
            className="h-11 text-base sm:h-12"
          />
          <Input
            label="Company Name"
            type="text"
            required
            value={companyName || ''}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Real Estate"
            disabled={loading}
            autoComplete="organization"
            className="h-11 text-base sm:h-12"
          />
        </div>
      )}

      {/* Email Input */}
      <Input
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={loading}
        autoComplete="email"
        className="h-11 text-base sm:h-12"
      />

      {/* Password Input */}
      <PasswordInput
        label="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        disabled={loading}
        autoComplete={type === 'signin' ? 'current-password' : 'new-password'}
        helperText={
          type === 'signup' ? 'Must be at least 6 characters' : undefined
        }
        minLength={type === 'signup' ? 6 : undefined}
      />

      {/* Submit Button */}
      <AuthButton variant={type} loading={loading} disabled={loading}>
        {type === 'signin' ? 'Sign In' : 'Create Company Account'}
      </AuthButton>

      {/* Secondary Action */}
      <AuthSecondaryAction authType={type} />
    </form>
  )
}

