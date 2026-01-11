'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AlertCircle, Clock, Receipt, Building2, Home, User, Calendar, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getOverdueRentPeriods, getDueTodayRentPeriods, type OverdueRentPeriod, type DueTodayRentPeriod } from '@/app/actions/follow-ups'
import { formatCurrency } from '@/lib/utils/currency'

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

export function FollowUpQueue({
  orgSlug,
  orgName,
  currency,
}: {
  orgSlug: string
  orgName: string
  currency: string
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [overduePeriods, setOverduePeriods] = useState<OverdueRentPeriod[]>([])
  const [dueTodayPeriods, setDueTodayPeriods] = useState<DueTodayRentPeriod[]>([])
  const [activeTab, setActiveTab] = useState<'overdue' | 'due-today'>('overdue')

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

      if (overdueRes.error) {
        toast.error(overdueRes.error)
      } else if (overdueRes.data) {
        setOverduePeriods(overdueRes.data)
      }

      if (dueTodayRes.error) {
        toast.error(dueTodayRes.error)
      } else if (dueTodayRes.data) {
        setDueTodayPeriods(dueTodayRes.data)
      }

      setIsLoading(false)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  const displayPeriods = activeTab === 'overdue' ? overduePeriods : dueTodayPeriods
  const hasOverdue = overduePeriods.length > 0
  const hasDueToday = dueTodayPeriods.length > 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Follow-up Queue</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Track and manage overdue and due today rent periods for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Rent periods requiring attention</CardTitle>
              <CardDescription className="mt-1">
                Review overdue and due today periods. Record payments or take follow-up actions.
              </CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={refresh} disabled={isPending || isLoading} loading={isLoading}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('overdue')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'overdue'
                    ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                Overdue
                {hasOverdue && (
                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {overduePeriods.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('due-today')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'due-today'
                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                <Clock className="h-4 w-4" />
                Due today
                {hasDueToday && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {dueTodayPeriods.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3 pt-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24 rounded-md" />
                      <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayPeriods.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                {activeTab === 'overdue' ? (
                  <>
                    <AlertCircle className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                    <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">No overdue periods</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      Great! All rent periods are up to date.
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                    <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">No periods due today</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      No rent periods are due today. Check back tomorrow or view all periods.
                    </p>
                  </>
                )}
                <div className="mt-4">
                  <Link href={`/app/org/${orgSlug}/rent-periods`}>
                    <Button variant="secondary" size="sm">
                      View all periods
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                <AnimatePresence mode="wait">
                  {displayPeriods.map((period) => {
                    const isOverdue = period.status === 'OVERDUE'
                    const building = period.rent_config.occupancy.unit.building
                    const unit = period.rent_config.occupancy.unit
                    const tenant = period.rent_config.occupancy.tenant

                    return (
                      <motion.div
                        key={period.id}
                        initial={fadeUp.initial}
                        animate={fadeUp.animate}
                        exit={fadeUp.exit}
                        className={`rounded-lg border p-4 transition-all ${
                          isOverdue
                            ? (() => {
                                const isCritical = period.days_overdue > 30
                                const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                                const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                                if (isCritical) return 'border-l-4 border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                                if (isHigh) return 'border-l-4 border-red-500 bg-red-50/80 dark:border-red-600 dark:bg-red-950/15'
                                if (isMedium) return 'border-l-4 border-red-400 bg-red-50/60 dark:border-red-700 dark:bg-red-950/10'
                                return 'border-l-4 border-red-300 bg-red-50/40 dark:border-red-800 dark:bg-red-950/5'
                              })()
                            : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-start gap-3">
                              {isOverdue ? (
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                              ) : (
                                <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3
                                    className={`text-sm font-semibold ${
                                      isOverdue
                                        ? 'text-red-900 dark:text-red-100'
                                        : 'text-amber-900 dark:text-amber-100'
                                    }`}
                                  >
                                    {tenant.full_name}
                                  </h3>
                                  {isOverdue && (() => {
                                    const isCritical = period.days_overdue > 30
                                    const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                                    const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                                    const priorityLabel = isCritical ? 'Critical' : isHigh ? 'High' : isMedium ? 'Medium' : 'Low'
                                    const badgeClass = isCritical
                                      ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                                      : isHigh
                                        ? 'bg-red-500 text-white dark:bg-red-600 dark:text-white'
                                        : isMedium
                                          ? 'bg-red-400 text-white dark:bg-red-700 dark:text-white'
                                          : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                    return (
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                        {priorityLabel} • {period.days_overdue} day{period.days_overdue !== 1 ? 's' : ''} overdue
                                      </span>
                                    )
                                  })()}
                                </div>
                                <p
                                  className={`mt-1 text-xs ${
                                    isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {formatCurrency(period.rent_config.amount, currency)} • {formatDate(period.due_date)}
                                </p>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="ml-8 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">{building.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Home className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">Unit {unit.unit_number}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">{tenant.full_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">
                                  {formatDate(period.period_start)} - {formatDate(period.period_end)}
                                </span>
                              </div>
                              {tenant.email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-400">Email:</span>
                                  <span className="text-zinc-600 dark:text-zinc-400">{tenant.email}</span>
                                </div>
                              )}
                              {tenant.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-400">Phone:</span>
                                  <span className="text-zinc-600 dark:text-zinc-400">{tenant.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Link href={`/app/org/${orgSlug}/payments?rentPeriodId=${period.id}`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full sm:w-auto"
                                disabled={isPending}
                              >
                                <Receipt className="mr-1.5 h-4 w-4" />
                                Record payment
                              </Button>
                            </Link>
                            <Link href={`/app/org/${orgSlug}/rent-periods`}>
                              <Button variant="secondary" size="sm" className="w-full sm:w-auto" disabled={isPending}>
                                <Wallet className="mr-1.5 h-4 w-4" />
                                View details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

