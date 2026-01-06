'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Calendar, Pencil, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createRentConfig, deleteRentConfig, listRentConfigs, updateRentConfig } from '@/app/actions/rent-configs'
import { listOccupancies } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'
import { formatCurrency } from '@/lib/utils/currency'

type RentConfig = {
  id: string
  organization_id: string
  occupancy_id: string
  amount: number
  cycle: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'
  due_day: number
  created_at: string
  updated_at: string
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
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } },
}

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const

export function RentConfigsManager({
  orgSlug,
  orgName,
  currency,
  initialRentConfigs,
  initialOccupancies,
  initialUnits,
  initialTenants,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialRentConfigs: RentConfig[]
  initialOccupancies: Occupancy[]
  initialUnits: Unit[]
  initialTenants: Tenant[]
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [rentConfigs, setRentConfigs] = useState<RentConfig[]>(initialRentConfigs)
  const [occupancies, setOccupancies] = useState<Occupancy[]>(initialOccupancies)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterOccupancyId, setFilterOccupancyId] = useState<string>('')

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [occupancyId, setOccupancyId] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY')
  const [dueDay, setDueDay] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Filter rent configs
  const filteredRentConfigs = useMemo(() => {
    if (!filterOccupancyId) return rentConfigs
    return rentConfigs.filter((rc) => rc.occupancy_id === filterOccupancyId)
  }, [rentConfigs, filterOccupancyId])

  // Helper functions
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

  const canSubmit = useMemo(
    () =>
      occupancyId.trim().length > 0 &&
      amount.trim().length > 0 &&
      parseFloat(amount) > 0 &&
      dueDay.trim().length > 0 &&
      parseInt(dueDay) >= 1 &&
      parseInt(dueDay) <= 31 &&
      !isPending,
    [occupancyId, amount, dueDay, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setOccupancyId('')
    setAmount('')
    setCycle('MONTHLY')
    setDueDay('')
    setError(null)
  }

  const refresh = () => {
    startTransition(async () => {
      const [rentConfigsRes, occupanciesRes, unitsRes, tenantsRes, buildingsRes] = await Promise.all([
        listRentConfigs(orgSlug, filterOccupancyId || undefined),
        listOccupancies(orgSlug),
        listUnits(orgSlug),
        listTenants(orgSlug),
        listBuildings(orgSlug),
      ])

      if (rentConfigsRes.error) {
        setError(rentConfigsRes.error)
        return
      }
      if (occupanciesRes.error) {
        setError(occupanciesRes.error)
        return
      }
      if (unitsRes.error) {
        setError(unitsRes.error)
        return
      }
      if (tenantsRes.error) {
        setError(tenantsRes.error)
        return
      }
      if (buildingsRes.error) {
        setError(buildingsRes.error)
        return
      }

      setRentConfigs(rentConfigsRes.data ?? [])
      setOccupancies(occupanciesRes.data ?? [])
      setUnits(unitsRes.data ?? [])
      setTenants(tenantsRes.data ?? [])
      setBuildings(buildingsRes.data ?? [])
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOccupancyId])

  const onSubmit = () => {
    setError(null)

    if (!occupancyId.trim()) {
      setError('Occupancy is required.')
      return
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than 0.')
      return
    }

    const dueDayNum = parseInt(dueDay)
    if (!dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError('Due day must be between 1 and 31.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createRentConfig(orgSlug, {
          occupancy_id: occupancyId.trim(),
          amount: amountNum,
          cycle,
          due_day: dueDayNum,
        })
        if (res.error) {
          setError(res.error)
          return
        }
        resetForm()
        refresh()
        return
      }

      if (!editingId) {
        setError('No rent config selected to edit.')
        return
      }

      const res = await updateRentConfig(orgSlug, editingId, {
        occupancy_id: occupancyId.trim(),
        amount: amountNum,
        cycle,
        due_day: dueDayNum,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      resetForm()
      refresh()
    })
  }

  const onEdit = (rc: RentConfig) => {
    setMode('edit')
    setEditingId(rc.id)
    setOccupancyId(rc.occupancy_id)
    setAmount(rc.amount.toString())
    setCycle(rc.cycle)
    setDueDay(rc.due_day.toString())
    setError(null)
  }

  const onDelete = (rc: RentConfig) => {
    const occupancyLabel = getOccupancyLabel(rc.occupancy_id)
    const ok = window.confirm(
      `Delete rent config for ${occupancyLabel}? This will remove the rent configuration and may affect linked rent periods.`
    )
    if (!ok) return

    setError(null)
    startTransition(async () => {
      const res = await deleteRentConfig(orgSlug, rc.id)
      if (res.error) {
        setError(res.error)
        return
      }
      if (editingId === rc.id) resetForm()
      refresh()
    })
  }


  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rent Configs
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Define rent amounts and schedules for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your rent configs</CardTitle>
                <CardDescription className="mt-1">
                  Configure rent amounts, cycles, and due days for each occupancy.
                </CardDescription>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={refresh}
                disabled={isPending}
                className="shrink-0"
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filter */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <select
                  value={filterOccupancyId}
                  onChange={(e) => setFilterOccupancyId(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  disabled={isPending}
                >
                  <option value="">All occupancies</option>
                  {occupancies.map((o) => (
                    <option key={o.id} value={o.id}>
                      {getOccupancyLabel(o.id)}
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
              </AnimatePresence>

              {filteredRentConfigs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {occupancies.length === 0
                      ? 'Create occupancies first, then add rent configs for them.'
                      : 'No rent configs yet. Create your first rent config to define rent schedules.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {filteredRentConfigs.map((rc) => (
                    <div
                      key={rc.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {getOccupancyLabel(rc.occupancy_id)}
                          </span>
                          {editingId === rc.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium">{formatCurrency(rc.amount, currency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <span>
                              {CYCLE_OPTIONS.find((c) => c.value === rc.cycle)?.label} • Due day {rc.due_day}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(rc)}
                          disabled={isPending}
                          aria-label={`Edit rent config`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(rc)}
                          disabled={isPending}
                          aria-label={`Delete rent config`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>{mode === 'create' ? 'Add a rent config' : 'Edit rent config'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Define rent amount, cycle, and due day for an occupancy.'
                  : 'Update the rent config details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {occupancies.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>Create occupancies first before adding rent configs.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="rent-config-occupancy"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Occupancy <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="rent-config-occupancy"
                      value={occupancyId}
                      onChange={(e) => setOccupancyId(e.target.value)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    >
                      <option value="">Select an occupancy</option>
                      {occupancies.map((o) => (
                        <option key={o.id} value={o.id}>
                          {getOccupancyLabel(o.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    id="rent-config-amount"
                    label="Amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending}
                    required
                  />

                  <div>
                    <label
                      htmlFor="rent-config-cycle"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Cycle <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="rent-config-cycle"
                      value={cycle}
                      onChange={(e) => setCycle(e.target.value as typeof cycle)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    >
                      {CYCLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    id="rent-config-due-day"
                    label="Due day (1-31)"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    disabled={isPending}
                    required
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onSubmit}
                      disabled={!canSubmit}
                      fullWidth
                    >
                      {isPending
                        ? 'Saving...'
                        : mode === 'create'
                          ? 'Create rent config'
                          : 'Save changes'}
                    </Button>
                  </div>

                  {mode === 'edit' ? (
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={resetForm}
                      disabled={isPending}
                      className="w-full"
                    >
                      Cancel editing
                    </Button>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

