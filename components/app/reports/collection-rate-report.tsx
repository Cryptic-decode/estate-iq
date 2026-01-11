'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { LineChart, RefreshCw, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/currency'
import { getCollectionRate, type CollectionRateReport } from '@/app/actions/reports'

export function CollectionRateReportView({
  orgSlug,
  orgName,
  currency,
  initialReport,
  initialError,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialReport: CollectionRateReport | null
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<CollectionRateReport | null>(initialReport)
  const [error, setError] = useState<string | null>(initialError)

  // Default to last 30 days
  const getDefaultStartDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  }

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const [startDate, setStartDate] = useState<string>(() => {
    if (initialReport?.dateRange.startDate) {
      return initialReport.dateRange.startDate
    }
    return getDefaultStartDate()
  })

  const [endDate, setEndDate] = useState<string>(() => {
    if (initialReport?.dateRange.endDate) {
      return initialReport.dateRange.endDate
    }
    return getDefaultEndDate()
  })

  useEffect(() => {
    if (initialError) toast.error(initialError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadReport = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    setIsLoading(true)
    startTransition(async () => {
      const res = await getCollectionRate(orgSlug, startDate, endDate)
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

  const refresh = () => {
    loadReport()
  }

  const handleDateChange = () => {
    // Auto-refresh when dates change (with debounce could be added later)
    if (startDate && endDate) {
      loadReport()
    }
  }

  const isEmpty = (report?.metrics.periodCount ?? 0) === 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Collection Rate
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Measure rent collected vs. due across a selected date range for <span className="font-medium">{orgName}</span>.
          </p>
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

      {/* Date Range Picker */}
      <Card className="mb-6 p-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-base">Date Range</CardTitle>
          </div>
          <CardDescription className="mt-1">Select the date range for collection rate analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Start Date
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (e.target.value && endDate) {
                    handleDateChange()
                  }
                }}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                End Date
              </label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  if (startDate && e.target.value) {
                    handleDateChange()
                  }
                }}
                className="w-full"
              />
            </div>
            <div className="sm:w-auto">
              <Button
                variant="secondary"
                size="md"
                onClick={loadReport}
                disabled={isPending || isLoading || !startDate || !endDate}
                loading={isLoading}
                className="w-full sm:w-auto"
              >
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Summary Cards */}
      {isLoading && !report ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Due</CardTitle>
              <CardDescription className="mt-1">Rent due in range</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(report?.metrics.totalDue ?? 0, currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Total Collected</CardTitle>
              <CardDescription className="mt-1">Payments received</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatCurrency(report?.metrics.totalCollected ?? 0, currency)}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Collection Rate</CardTitle>
              <CardDescription className="mt-1">Percentage collected</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {(report?.metrics.collectionRate ?? 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Period Count</CardTitle>
              <CardDescription className="mt-1">Total periods in range</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.metrics.periodCount ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Paid Periods</CardTitle>
              <CardDescription className="mt-1">Periods with payments</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.metrics.paidPeriodCount ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Card */}
      <Card className="p-0">
        <CardHeader>
          <CardTitle className="text-base">Collection Summary</CardTitle>
          <CardDescription className="mt-1">
            Overview of collection performance for the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && report ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : isEmpty ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No rent periods in date range</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Adjust the date range to see collection rate metrics for periods with due dates in that range.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Date Range</div>
                    <div className="mt-1 text-base text-zinc-900 dark:text-zinc-50">
                      {report?.dateRange.startDate && report?.dateRange.endDate
                        ? `${new Date(report.dateRange.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })} - ${new Date(report.dateRange.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Generated At</div>
                    <div className="mt-1 text-base text-zinc-900 dark:text-zinc-50">
                      {report?.generatedAt
                        ? new Date(report.generatedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                  <div className="col-span-6">Metric</div>
                  <div className="col-span-6 text-right">Value</div>
                </div>

                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <div className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-50">Total Due</div>
                    <div className="col-span-6 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(report?.metrics.totalDue ?? 0, currency)}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-50">Total Collected</div>
                    <div className="col-span-6 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(report?.metrics.totalCollected ?? 0, currency)}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-50">Collection Rate</div>
                    <div className="col-span-6 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {(report?.metrics.collectionRate ?? 0).toFixed(2)}%
                    </div>
                  </div>
                  <div className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-50">Period Count</div>
                    <div className="col-span-6 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {report?.metrics.periodCount ?? 0}
                    </div>
                  </div>
                  <div className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6 font-medium text-zinc-900 dark:text-zinc-50">Paid Period Count</div>
                    <div className="col-span-6 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {report?.metrics.paidPeriodCount ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

