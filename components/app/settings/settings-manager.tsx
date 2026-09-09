'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Wallet, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, type SelectOption } from '@/components/ui/select'
import { updateOrganizationCurrency } from '@/app/actions/organizations'
import { CURRENCY_OPTIONS } from '@/lib/utils/currency'
import { PageHeader } from '@/components/app/page-header'

export function SettingsManager({
  orgSlug,
  orgName,
  initialCurrency,
}: {
  orgSlug: string
  orgName: string
  initialCurrency: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currency, setCurrency] = useState(initialCurrency)

  const hasChanges = currency !== initialCurrency
  const currencyOptions: SelectOption[] = CURRENCY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))

  const onSubmit = () => {
    if (!currency || !/^[A-Z]{3}$/.test(currency)) {
      toast.error('Invalid currency code.', {
        description: 'Use a 3-letter ISO 4217 code.',
      })
      return
    }

    startTransition(async () => {
      const res = await updateOrganizationCurrency(orgSlug, currency)
      if (res.error) {
        toast.error('Unable to update currency', {
          description: res.error,
        })
        return
      }

      toast.success('Currency updated successfully.')
      router.refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <PageHeader eyebrow="Organization" title="Settings" description={`Manage organization preferences for ${orgName}.`} />

        <Card className="mt-6">
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
                  <Wallet className="h-4 w-4" />
                  Currency
                </div>
              </label>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Select the currency for all rent amounts and financial displays in this organization.
              </p>
              <div className="mt-2">
                <Select
                  options={currencyOptions}
                  value={currencyOptions.find((o) => o.value === currency) ?? null}
                  onChange={(opt) => {
                    setCurrency(opt?.value || initialCurrency)
                  }}
                  isDisabled={isPending}
                  placeholder="Select currency"
                />
              </div>
            </div>

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
