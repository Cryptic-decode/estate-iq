'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PieChart, RefreshCw, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import { getBuildingRollups, type BuildingRollupsReport } from '@/app/actions/reports'

export function BuildingRollupsReportView({
  orgSlug,
  orgName,
  currency,
  initialReport,
  initialError,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialReport: BuildingRollupsReport | null
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [report, setReport] = useState<BuildingRollupsReport | null>(initialReport)
  const [error, setError] = useState<string | null>(initialError)

  useEffect(() => {
    if (initialError) toast.error(initialError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await getBuildingRollups(orgSlug)
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
            <PieChart className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Building rollups
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Unpaid totals and overdue risk by building for <span className="font-medium">{orgName}</span>.
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
              <CardTitle className="text-sm">Buildings with unpaid</CardTitle>
              <CardDescription className="mt-1">At least 1 due/overdue</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.buildingsWithUnpaid ?? 0}
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
              <CardTitle className="text-sm">Overdue periods</CardTitle>
              <CardDescription className="mt-1">Past due date</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.overduePeriods ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Due periods</CardTitle>
              <CardDescription className="mt-1">Not overdue yet</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {report?.totals.duePeriods ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="p-0">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Rollups</CardTitle>
            <CardDescription className="mt-1">Sorted by unpaid amount (desc).</CardDescription>
          </div>
          <Link href={`/app/org/${orgSlug}/buildings-unpaid`} className="w-full sm:w-auto">
            <Button variant="tertiary" size="sm" className="w-full sm:w-auto">
              Open operational view
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
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
                Once you have due or overdue rent periods, they’ll be grouped here by building.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <div className="col-span-6">Building</div>
                <div className="col-span-2 text-right">Overdue</div>
                <div className="col-span-2 text-right">Due</div>
                <div className="col-span-2 text-right">Unpaid</div>
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(report?.rows ?? []).map((r) => (
                  <div key={r.building.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                    <div className="col-span-6 min-w-0">
                      <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">{r.building.name}</div>
                      {r.building.address ? (
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{r.building.address}</div>
                      ) : null}
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.overduePeriods > 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {r.overduePeriods}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.duePeriods > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        {r.duePeriods}
                      </span>
                    </div>

                    <div className="col-span-2 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(r.unpaidAmount, currency)}
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


