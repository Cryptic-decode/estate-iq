'use client'

import { useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings as SettingsIcon, DollarSign, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateOrganizationCurrency, getOrganizationBySlug } from '@/app/actions/organizations'
import { CURRENCY_OPTIONS } from '@/lib/utils/currency'

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } },
}

export function SettingsManager({
  orgSlug,
  orgName,
  initialCurrency,
}: {
  orgSlug: string
  orgName: string
  initialCurrency: string
}) {
  const [isPending, startTransition] = useTransition()
  const [currency, setCurrency] = useState(initialCurrency)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasChanges = currency !== initialCurrency

  const onSubmit = () => {
    setError(null)
    setSuccess(null)

    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      setError('Invalid currency code. Must be a 3-letter ISO 4217 code.')
      return
    }

    startTransition(async () => {
      const res = await updateOrganizationCurrency(orgSlug, currency)
      if (res.error) {
        setError(res.error)
        return
      }

      setSuccess('Currency updated successfully')
      // Refresh the page after a short delay to show success message
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    })
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Settings
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Manage organization settings for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <SettingsIcon className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
              </div>
              <div>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription className="mt-1">
                  Configure your organization preferences. Only organization owners can modify these settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Currency Setting */}
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Currency
                </div>
              </label>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select the currency for all rent amounts and financial displays in this organization.
              </p>
              <select
                id="currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                disabled={isPending}
                className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  {...fadeUp}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  {...fadeUp}
                  className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-200"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={onSubmit}
                disabled={!hasChanges || isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isPending ? 'Saving...' : 'Save changes'}
              </Button>
              {hasChanges && (
                <Button
                  variant="tertiary"
                  size="md"
                  onClick={() => {
                    setCurrency(initialCurrency)
                    setError(null)
                    setSuccess(null)
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

