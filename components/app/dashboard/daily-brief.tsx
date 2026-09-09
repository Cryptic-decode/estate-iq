'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, ButtonLink } from '@/components/ui/button'
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
          {/* Summary */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
              <div className="border-b border-border py-4 sm:border-b-0 sm:px-4 sm:first:pl-0">
                <div className="font-estate-serif text-3xl tabular-nums text-red-700 dark:text-red-300">{overdueCount}</div>
                <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">Overdue periods</p>
                {totalOverdueAmount > 0 && (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {formatCurrency(totalOverdueAmount, currency)}
                  </p>
                )}
              </div>
              <div className="border-b border-border py-4 sm:border-b-0 sm:px-4">
                <div className="font-estate-serif text-3xl tabular-nums text-amber-700 dark:text-amber-300">{dueTodayCount}</div>
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Due today</p>
              </div>
              <div className="py-4 sm:px-4 sm:last:pr-0">
                <div className="font-estate-serif text-3xl tabular-nums text-card-foreground">
                  {overdueCount + dueTodayCount}
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">Needs attention</p>
              </div>
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
                <h3 className="text-sm font-semibold text-foreground">Priority items</h3>
                <ButtonLink href={`/app/org/${orgSlug}/rent-periods`} variant="tertiary" size="sm" className="text-xs">
                  View all
                </ButtonLink>
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
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                  {period.rent_config.occupancy.unit.building.name} - Unit{' '}
                                  {period.rent_config.occupancy.unit.unit_number}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-300">
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
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : overdueCount === 0 && dueTodayCount === 0 ? (
            <div className="border-y border-border py-8 text-center">
              <p className="text-sm font-medium text-foreground">Nothing needs attention today</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No rent periods are overdue or due today.
              </p>
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <ButtonLink href={`/app/org/${orgSlug}/rent-periods`} variant="secondary" size="sm" fullWidth className="flex-1 sm:w-auto sm:flex-none">
              View all periods
            </ButtonLink>
            {overdueCount > 0 && (
              <ButtonLink href={`/app/org/${orgSlug}/rent-periods?status=OVERDUE`} size="sm" fullWidth className="flex-1 sm:w-auto sm:flex-none">
                View overdue ({overdueCount})
              </ButtonLink>
            )}
            {dueTodayCount > 0 && (
              <ButtonLink href={`/app/org/${orgSlug}/payments`} size="sm" fullWidth className="flex-1 sm:w-auto sm:flex-none">
                Record payments ({dueTodayCount})
              </ButtonLink>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
