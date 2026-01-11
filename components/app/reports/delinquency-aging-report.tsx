'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { BarChart3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import { getDelinquencyAging, type DelinquencyAgingReport } from '@/app/actions/reports'

export function DelinquencyAgingReportView({
  orgSlug,
  orgName,
  currency,
  initialReport,
  initialError,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialReport: DelinquencyAgingReport | null
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<DelinquencyAgingReport | null>(initialReport)
  const [error, setError] = useState<string | null>(initialError)

  useEffect(() => {
    if (initialError) toast.error(initialError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await getDelinquencyAging(orgSlug)
      setIsLoading(false)

      if (res.error) {
        setError(res.error)
        toast.error(res.error)
        return
      }

      setError(null)
      setReport(res.data)
      toast.success('Report refreshed')
    })
  }

  const isEmpty = (report?.totals.unpaidPeriods ?? 0) === 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Overdue Analysis
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Unpaid rent grouped by how long it&apos;s been overdue for <span className="font-medium">{orgName}</span>.
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Aging buckets: 0–7, 8–15, 16–30, 31+ days</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href={`/app/org/${orgSlug}/reports`} className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full">
              Back to reports
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={refresh}
            disabled={isPending || isLoading}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary */}
      {isLoading && !report ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Unpaid periods</CardTitle>
              <CardDescription className="mt-1">Total DUE + OVERDUE</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.unpaidPeriods ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Unpaid amount</CardTitle>
              <CardDescription className="mt-1">Total outstanding</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(report?.totals.unpaidAmount ?? 0, currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Due</CardTitle>
              <CardDescription className="mt-1">Not overdue yet</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.duePeriods ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Overdue</CardTitle>
              <CardDescription className="mt-1">Past due date</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.overduePeriods ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Buckets table */}
      <Card className="p-0">
        <CardHeader>
          <CardTitle className="text-base">Aging buckets</CardTitle>
          <CardDescription className="mt-1">How much is outstanding across age ranges.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && report ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : isEmpty ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No unpaid rent periods</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Once you have due or overdue rent periods, they’ll show up here by aging bucket.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <div className="col-span-4">Bucket</div>
                <div className="col-span-4">Unpaid periods</div>
                <div className="col-span-4 text-right">Unpaid amount</div>
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(report?.buckets ?? []).map((b) => (
                  <div key={b.label} className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-4 font-medium text-zinc-900 dark:text-zinc-50">{b.label} days</div>
                    <div className="col-span-4 text-zinc-700 dark:text-zinc-200">{b.unpaidPeriods}</div>
                    <div className="col-span-4 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(b.unpaidAmount, currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


