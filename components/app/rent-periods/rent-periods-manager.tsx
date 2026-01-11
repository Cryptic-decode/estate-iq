'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Wallet, AlertCircle, CheckCircle2, Clock, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { listRentPeriods, updateRentPeriodStatus, generateNextRentPeriod } from '@/app/actions/rent-periods'
import { listRentConfigs } from '@/app/actions/rent-configs'
import { listOccupancies } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'
import { formatCurrency } from '@/lib/utils/currency'

type RentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'DUE' | 'PAID' | 'OVERDUE'
  days_overdue: number
  created_at: string
  updated_at: string
}

type RentConfig = {
  id: string
  occupancy_id: string
  amount: number
  cycle: string
  due_day: number
}

type Occupancy = {
  id: string
  unit_id: string
  tenant_id: string
}

type Unit = {
  id: string
  building_id: string
  unit_number: string
}

type Tenant = {
  id: string
  full_name: string
}

type Building = {
  id: string
  name: string
}

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

export function RentPeriodsManager({
  orgSlug,
  orgName,
  currency,
  initialRentPeriods,
  initialRentConfigs,
  initialOccupancies,
  initialUnits,
  initialTenants,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialRentPeriods: RentPeriod[]
  initialRentConfigs: RentConfig[]
  initialOccupancies: Occupancy[]
  initialUnits: Unit[]
  initialTenants: Tenant[]
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>(initialRentPeriods)
  const [rentConfigs, setRentConfigs] = useState<RentConfig[]>(initialRentConfigs)
  const [occupancies, setOccupancies] = useState<Occupancy[]>(initialOccupancies)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DUE' | 'PAID' | 'OVERDUE'>('ALL')
  const [filterRentConfigId, setFilterRentConfigId] = useState<string>('')
  const [generateRentConfigId, setGenerateRentConfigId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Filter rent periods
  const filteredRentPeriods = useMemo(() => {
    let filtered = rentPeriods
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((rp) => rp.status === filterStatus)
    }
    if (filterRentConfigId) {
      filtered = filtered.filter((rp) => rp.rent_config_id === filterRentConfigId)
    }
    return filtered
  }, [rentPeriods, filterStatus, filterRentConfigId])

  // Helper functions
  const getRentConfig = (rentConfigId: string) => {
    return rentConfigs.find((rc) => rc.id === rentConfigId)
  }

  const getOccupancyLabel = (occupancyId: string) => {
    const occupancy = occupancies.find((o) => o.id === occupancyId)
    if (!occupancy) return 'Unknown occupancy'

    const unit = units.find((u) => u.id === occupancy.unit_id)
    const tenant = tenants.find((t) => t.id === occupancy.tenant_id)
    const building = unit ? buildings.find((b) => b.id === unit.building_id) : null

    const unitLabel = unit && building ? `${building.name} - Unit ${unit.unit_number}` : 'Unknown unit'
    const tenantLabel = tenant?.full_name || 'Unknown tenant'

    return `${tenantLabel} in ${unitLabel}`
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const [rentPeriodsRes, rentConfigsRes, occupanciesRes, unitsRes, tenantsRes, buildingsRes] =
        await Promise.all([
          listRentPeriods(orgSlug),
          listRentConfigs(orgSlug),
          listOccupancies(orgSlug),
          listUnits(orgSlug),
          listTenants(orgSlug),
          listBuildings(orgSlug),
        ])

      setIsLoading(false)
      if (rentPeriodsRes.error) {
        toast.error(rentPeriodsRes.error)
        return
      }
      if (rentConfigsRes.error) {
        toast.error(rentConfigsRes.error)
        return
      }
      if (occupanciesRes.error) {
        toast.error(occupanciesRes.error)
        return
      }
      if (unitsRes.error) {
        toast.error(unitsRes.error)
        return
      }
      if (tenantsRes.error) {
        toast.error(tenantsRes.error)
        return
      }
      if (buildingsRes.error) {
        toast.error(buildingsRes.error)
        return
      }

      setRentPeriods(rentPeriodsRes.data ?? [])
      setRentConfigs(rentConfigsRes.data ?? [])
      setOccupancies(occupanciesRes.data ?? [])
      setUnits(unitsRes.data ?? [])
      setTenants(tenantsRes.data ?? [])
      setBuildings(buildingsRes.data ?? [])
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const onStatusChange = (rentPeriodId: string, newStatus: 'DUE' | 'PAID' | 'OVERDUE') => {
    setError(null)
    startTransition(async () => {
      const res = await updateRentPeriodStatus(orgSlug, rentPeriodId, { status: newStatus })
      if (res.error) {
        toast.error(res.error)
        return
      }
      refresh()
      toast.success(`Rent period marked as ${newStatus.toLowerCase()}.`)
    })
  }

  const onGeneratePeriod = () => {
    if (!generateRentConfigId) {
      toast.error('Please select a rent config to generate a period for.')
      return
    }

    setError(null)
    startTransition(async () => {
      const res = await generateNextRentPeriod(orgSlug, generateRentConfigId)
      if (res.error) {
        toast.error(res.error)
        return
      }
      const rentConfig = getRentConfig(generateRentConfigId)
      const occupancyLabel = rentConfig ? getOccupancyLabel(rentConfig.occupancy_id) : 'rent config'
      setGenerateRentConfigId('')
      refresh()
      toast.success(`Rent period generated for ${occupancyLabel}!`, {
        description: 'You can now track payments for this period.',
      })
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }


  const getStatusBadge = (status: string, daysOverdue: number) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        )
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle className="h-3 w-3" />
            Overdue ({daysOverdue} days)
          </span>
        )
      case 'DUE':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Due
          </span>
        )
    }
  }

  const stats = useMemo(() => {
    const total = rentPeriods.length
    const paid = rentPeriods.filter((rp) => rp.status === 'PAID').length
    const due = rentPeriods.filter((rp) => rp.status === 'DUE').length
    const overdue = rentPeriods.filter((rp) => rp.status === 'OVERDUE').length
    const totalOverdue = rentPeriods
      .filter((rp) => rp.status === 'OVERDUE')
      .reduce((sum, rp) => {
        const config = getRentConfig(rp.rent_config_id)
        return sum + (config?.amount || 0)
      }, 0)

    return { total, paid, due, overdue, totalOverdue }
  }, [rentPeriods, rentConfigs])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rent Periods
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Track rent periods and payment status for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {stats.total}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Total periods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {stats.paid}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {stats.due}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Due</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {stats.overdue}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(stats.totalOverdue, currency)}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">Overdue amount</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Rent periods</CardTitle>
              <CardDescription className="mt-1">
                View and manage rent periods. Generate new periods or update status to track payments.
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isPending || isLoading}
              loading={isLoading}
              className="shrink-0"
            >
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Generate Period Section */}
            {rentConfigs.length > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Generate next period
                </div>
                <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-300">
                  Select a rent config to generate the next rent period automatically.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={generateRentConfigId}
                    onChange={(e) => {
                      setGenerateRentConfigId(e.target.value)
                      setError(null)
                    }}
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    disabled={isPending}
                  >
                    <option value="">Select a rent config</option>
                    {rentConfigs.map((rc) => (
                      <option key={rc.id} value={rc.id}>
                        {getOccupancyLabel(rc.occupancy_id)} - {formatCurrency(rc.amount, currency)}/{rc.cycle.toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onGeneratePeriod}
                    disabled={!generateRentConfigId || isPending}
                    loading={isPending}
                    className="shrink-0"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            )}
            {/* Filters */}
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row">
              <div className="flex flex-1 items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as typeof filterStatus)
                    setError(null)
                  }}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  disabled={isPending}
                >
                  <option value="ALL">All statuses</option>
                  <option value="DUE">Due</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              <select
                value={filterRentConfigId}
                onChange={(e) => {
                  setFilterRentConfigId(e.target.value)
                  setError(null)
                }}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                disabled={isPending}
              >
                <option value="">All rent configs</option>
                {rentConfigs.map((rc) => (
                  <option key={rc.id} value={rc.id}>
                    {getOccupancyLabel(rc.occupancy_id)}
                  </option>
                ))}
              </select>
            </div>

            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  initial={fadeUp.initial}
                  animate={fadeUp.animate}
                  exit={fadeUp.exit}
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredRentPeriods.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Calendar className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {rentConfigs.length === 0
                      ? 'Prerequisites needed'
                      : 'No rent periods found'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {rentConfigs.length === 0
                      ? 'Create rent configs first, then rent periods will be generated.'
                      : 'Generate rent periods for your rent configs to start tracking payments.'}
                  </p>
                  {rentConfigs.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Use the "Generate next period" button above to get started.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {filteredRentPeriods.map((rp) => {
                  const config = getRentConfig(rp.rent_config_id)
                  return (
                    <div
                      key={rp.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {config ? getOccupancyLabel(config.occupancy_id) : 'Unknown occupancy'}
                          </span>
                          {getStatusBadge(rp.status, rp.days_overdue)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                          {config && (
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-zinc-400" />
                              <span className="font-medium">{formatCurrency(config.amount, currency)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <span>
                              {formatDate(rp.period_start)} - {formatDate(rp.period_end)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">Due:</span>
                            <span>{formatDate(rp.due_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rp.status !== 'PAID' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onStatusChange(rp.id, 'PAID')}
                            disabled={isPending || isLoading}
                            loading={isPending}
                            className="text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            Mark paid
                          </Button>
                        )}
                        {rp.status === 'PAID' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onStatusChange(rp.id, 'DUE')}
                            disabled={isPending || isLoading}
                            loading={isPending}
                          >
                            Mark unpaid
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

