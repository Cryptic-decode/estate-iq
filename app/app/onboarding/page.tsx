'use client'

import { useState } from 'react'
import { createOrganization } from '@/app/actions/organizations'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('companyName', companyName)

    const result = await createOrganization(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // If successful, redirect happens in server action
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Welcome to EstateIQ</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Let's set up your company account
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-zinc-700"
            >
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Real Estate"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-zinc-500">
              This will be your organization name in EstateIQ
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !companyName.trim()}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  )
}

