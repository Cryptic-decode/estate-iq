'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AlertCircle, Calendar, Clock, ArrowRight, Receipt, Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getOverdueRentPeriods, getDueTodayRentPeriods } from '@/app/actions/follow-ups'
import { formatCurrency } from '@/lib/utils/currency'

type OverdueRentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'OVERDUE'
  days_overdue: number
  created_at: string
  updated_at: string
  rent_config: {
    id: string
    amount: number
    cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    due_day: number
    occupancy_id: string
    occupancy: {
      id: string
      active_from: string
      active_to: string | null
      unit_id: string
      tenant_id: string
      unit: {
        id: string
        unit_number: string
        building_id: string
        building: {
          id: string
          name: string
          address: string | null
        }
      }
      tenant: {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    }
  }
}

type DueTodayRentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'DUE'
  days_overdue: number
  created_at: string
  updated_at: string
  rent_config: {
    id: string
    amount: number
    cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    due_day: number
    occupancy_id: string
    occupancy: {
      id: string
      active_from: string
      active_to: string | null
      unit_id: string
      tenant_id: string
      unit: {
        id: string
        unit_number: string
        building_id: string
        building: {
          id: string
          name: string
          address: string | null
        }
      }
      tenant: {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    }
  }
}

export function DailyBrief({
  orgSlug,
  currency,
  initialOverdueCount,
  initialDueTodayCount,
}: {
  orgSlug: string
  currency: string
  initialOverdueCount: number
  initialDueTodayCount: number
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [overduePeriods, setOverduePeriods] = useState<OverdueRentPeriod[]>([])
  const [dueTodayPeriods, setDueTodayPeriods] = useState<DueTodayRentPeriod[]>([])
  const [overdueCount, setOverdueCount] = useState(initialOverdueCount)
  const [dueTodayCount, setDueTodayCount] = useState(initialDueTodayCount)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const [overdueRes, dueTodayRes] = await Promise.all([
        getOverdueRentPeriods(orgSlug),
        getDueTodayRentPeriods(orgSlug),
      ])

      if (overdueRes.data) {
        setOverduePeriods(overdueRes.data)
        setOverdueCount(overdueRes.data.length)
      }

      if (dueTodayRes.data) {
        setDueTodayPeriods(dueTodayRes.data)
        setDueTodayCount(dueTodayRes.data.length)
      }

      setIsLoading(false)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  // Get top 5 priority items (most overdue first)
  const priorityItems = overduePeriods.slice(0, 5)

  // Calculate total overdue amount
  const totalOverdueAmount = overduePeriods.reduce((sum, period) => sum + period.rent_config.amount, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
    >
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Daily Brief</CardTitle>
            <CardDescription className="mt-1">
              Your rent operations overview for today. See what needs attention.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={refresh} disabled={isPending || isLoading} loading={isLoading}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Overdue Card */}
              <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                      <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{overdueCount}</div>
                      <p className="text-xs text-red-700 dark:text-red-300">Overdue periods</p>
                    </div>
                  </div>
                  {totalOverdueAmount > 0 && (
                    <p className="mt-2 text-sm font-medium text-red-700 dark:text-red-300">
                      {formatCurrency(totalOverdueAmount, currency)}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Due Today Card */}
              <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1">
                      <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{dueTodayCount}</div>
                      <p className="text-xs text-amber-700 dark:text-amber-300">Due today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Unpaid Card */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <div className="flex-1">
                      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {overdueCount + dueTodayCount}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">Total unpaid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Priority Items */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : priorityItems.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Priority items</h3>
                <Link href={`/app/org/${orgSlug}/rent-periods`}>
                  <Button variant="tertiary" size="sm" className="text-xs">
                    View all
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {priorityItems.map((period) => {
                  const isCritical = period.days_overdue > 30
                  const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                  const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                  const priorityLabel = isCritical ? 'Critical' : isHigh ? 'High' : isMedium ? 'Medium' : 'Low'
                  const borderColor = isCritical
                    ? 'border-red-600 dark:border-red-500'
                    : isHigh
                      ? 'border-red-500 dark:border-red-600'
                      : isMedium
                        ? 'border-red-400 dark:border-red-700'
                        : 'border-red-300 dark:border-red-800'
                  const bgColor = isCritical
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : isHigh
                      ? 'bg-red-50/80 dark:bg-red-950/15'
                      : isMedium
                        ? 'bg-red-50/60 dark:bg-red-950/10'
                        : 'bg-red-50/40 dark:bg-red-950/5'

                  return (
                    <Link
                      key={period.id}
                      href={`/app/org/${orgSlug}/payments?rentPeriodId=${period.id}`}
                      className="block"
                    >
                      <Card className={`${borderColor} ${bgColor} border-l-4 transition-all hover:shadow-md`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                  {period.rent_config.occupancy.unit.building.name} - Unit{' '}
                                  {period.rent_config.occupancy.unit.unit_number}
                                </span>
                                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white dark:bg-red-500">
                                  {priorityLabel}
                                </span>
                              </div>
                              <p className="text-sm text-red-800 dark:text-red-200">
                                {period.rent_config.occupancy.tenant.full_name}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-red-700 dark:text-red-300">
                                <span>{formatCurrency(period.rent_config.amount, currency)}</span>
                                <span>•</span>
                                <span className="font-semibold">{period.days_overdue} days overdue</span>
                                <span>•</span>
                                <span>Due {formatDate(period.due_date)}</span>
                              </div>
                            </div>
                            <Receipt className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : overdueCount === 0 && dueTodayCount === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">All caught up!</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                No overdue or due today periods. Great work!
              </p>
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <Link href={`/app/org/${orgSlug}/rent-periods`} className="flex-1 sm:flex-none">
              <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                View all periods
              </Button>
            </Link>
            {overdueCount > 0 && (
              <Link href={`/app/org/${orgSlug}/rent-periods?status=OVERDUE`} className="flex-1 sm:flex-none">
                <Button variant="primary" size="sm" className="w-full sm:w-auto">
                  View overdue ({overdueCount})
                </Button>
              </Link>
            )}
            {dueTodayCount > 0 && (
              <Link href={`/app/org/${orgSlug}/payments`} className="flex-1 sm:flex-none">
                <Button variant="primary" size="sm" className="w-full sm:w-auto">
                  Record payments ({dueTodayCount})
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

