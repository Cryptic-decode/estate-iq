'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Building2, ChevronDown, ChevronRight, AlertCircle, Clock, Receipt, Home, User, Calendar, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getUnpaidRentPeriodsByBuilding, type BuildingWithUnpaidPeriods } from '@/app/actions/follow-ups'
import { formatCurrency } from '@/lib/utils/currency'

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

export function BuildingUnpaidView({
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
  const [buildings, setBuildings] = useState<BuildingWithUnpaidPeriods[]>([])
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const toggleBuilding = (buildingId: string) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev)
      if (next.has(buildingId)) {
        next.delete(buildingId)
      } else {
        next.add(buildingId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedBuildings(new Set(buildings.map((b) => b.building.id)))
  }

  const collapseAll = () => {
    setExpandedBuildings(new Set())
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await getUnpaidRentPeriodsByBuilding(orgSlug)

      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        setBuildings(res.data)
        // Auto-expand buildings with overdue periods
        const overdueBuildingIds = res.data
          .filter((b) => b.overdueCount > 0)
          .map((b) => b.building.id)
        setExpandedBuildings(new Set(overdueBuildingIds))
      }

      setIsLoading(false)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSlug])

  const totalUnpaidAmount = buildings.reduce((sum, b) => sum + b.totalUnpaidAmount, 0)
  const totalOverdueCount = buildings.reduce((sum, b) => sum + b.overdueCount, 0)
  const totalDueCount = buildings.reduce((sum, b) => sum + b.dueCount, 0)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Unpaid Rent by Building
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            View unpaid rent periods grouped by building for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        {/* Summary Stats */}
        {!isLoading && buildings.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-red-600 dark:text-red-400">{totalOverdueCount}</div>
                    <p className="text-xs text-red-700 dark:text-red-300">Total overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{totalDueCount}</div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Total due</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                      {formatCurrency(totalUnpaidAmount, currency)}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">Total unpaid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Buildings with unpaid rent</CardTitle>
              <CardDescription className="mt-1">
                Click on a building to view its unpaid rent periods. Expand all to see everything at once.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {buildings.length > 0 && (
                <>
                  <Button variant="tertiary" size="sm" onClick={expandAll} disabled={isPending || isLoading}>
                    Expand all
                  </Button>
                  <Button variant="tertiary" size="sm" onClick={collapseAll} disabled={isPending || isLoading}>
                    Collapse all
                  </Button>
                </>
              )}
              <Button variant="secondary" size="sm" onClick={refresh} disabled={isPending || isLoading} loading={isLoading}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : buildings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                <Building2 className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">No unpaid rent periods</p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Great! All rent periods are paid. All buildings are up to date.
                </p>
                <div className="mt-4">
                  <Link href={`/app/org/${orgSlug}/rent-periods`}>
                    <Button variant="secondary" size="sm">
                      View all periods
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {buildings.map((buildingGroup) => {
                    const isExpanded = expandedBuildings.has(buildingGroup.building.id)
                    const hasOverdue = buildingGroup.overdueCount > 0

                    return (
                      <motion.div
                        key={buildingGroup.building.id}
                        initial={fadeUp.initial}
                        animate={fadeUp.animate}
                        exit={fadeUp.exit}
                        className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        {/* Building Header */}
                        <button
                          onClick={() => toggleBuilding(buildingGroup.building.id)}
                          className="w-full p-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                              )}
                              <Building2 className="h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" />
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                                  {buildingGroup.building.name}
                                </h3>
                                {buildingGroup.building.address && (
                                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 truncate">
                                    {buildingGroup.building.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              {hasOverdue && (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                  {buildingGroup.overdueCount} overdue
                                </span>
                              )}
                              {buildingGroup.dueCount > 0 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                  {buildingGroup.dueCount} due
                                </span>
                              )}
                              <div className="text-right">
                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                  {formatCurrency(buildingGroup.totalUnpaidAmount, currency)}
                                </div>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                  {buildingGroup.unpaidPeriods.length} period{buildingGroup.unpaidPeriods.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Building Periods (Expandable) */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                                <div className="p-4 space-y-3">
                                  {buildingGroup.unpaidPeriods.map((period) => {
                                    const isOverdue = period.status === 'OVERDUE'
                                    const unit = period.rent_config.occupancy.unit
                                    const tenant = period.rent_config.occupancy.tenant

                                    return (
                                      <motion.div
                                        key={period.id}
                                        initial={fadeUp.initial}
                                        animate={fadeUp.animate}
                                        exit={fadeUp.exit}
                                        className={`rounded-lg border p-4 ${
                                          isOverdue
                                            ? (() => {
                                                const isCritical = period.days_overdue > 30
                                                const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                                                const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                                                if (isCritical) return 'border-l-4 border-red-600 bg-white dark:border-red-500 dark:bg-zinc-900'
                                                if (isHigh) return 'border-l-4 border-red-500 bg-white dark:border-red-600 dark:bg-zinc-900'
                                                if (isMedium) return 'border-l-4 border-red-400 bg-white dark:border-red-700 dark:bg-zinc-900'
                                                return 'border-l-4 border-red-300 bg-white dark:border-red-800 dark:bg-zinc-900'
                                              })()
                                            : 'border-amber-200 bg-white dark:border-amber-900/50 dark:bg-zinc-900'
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 space-y-2">
                                            {/* Period Header */}
                                            <div className="flex items-center gap-2">
                                              {isOverdue ? (
                                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                                              ) : (
                                                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                              )}
                                              <h4
                                                className={`text-sm font-semibold ${
                                                  isOverdue
                                                    ? 'text-red-900 dark:text-red-100'
                                                    : 'text-amber-900 dark:text-amber-100'
                                                }`}
                                              >
                                                {tenant.full_name}
                                              </h4>
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
                                                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                return (
                                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                                    {priorityLabel} • {period.days_overdue} day{period.days_overdue !== 1 ? 's' : ''} overdue
                                                  </span>
                                                )
                                              })()}
                                            </div>

                                            {/* Period Details */}
                                            <div className="ml-6 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                                              <div className="flex items-center gap-2">
                                                <Home className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="text-zinc-600 dark:text-zinc-400">Unit {unit.unit_number}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <User className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="text-zinc-600 dark:text-zinc-400">{tenant.full_name}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Wallet className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                  {formatCurrency(period.rent_config.amount, currency)}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                                <span className="text-zinc-600 dark:text-zinc-400">
                                                  Due {formatDate(period.due_date)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Actions */}
                                          <div className="flex flex-col gap-2 sm:flex-row shrink-0">
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
                                                View details
                                              </Button>
                                            </Link>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
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

