'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, Calendar, Pencil, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const

const WEEKDAY_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

const dayOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

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
  const [isLoading, setIsLoading] = useState(false)
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
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; rentConfig: RentConfig | null }>({
    open: false,
    rentConfig: null,
  })

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

  const occupancyOptions: SelectOption[] = useMemo(
    () =>
      occupancies.map((o) => ({
        value: o.id,
        label: getOccupancyLabel(o.id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occupancies, units, tenants, buildings]
  )

  const cycleOptions: SelectOption[] = useMemo(
    () => CYCLE_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
    []
  )

  const dueDayOptions: SelectOption[] = useMemo(() => {
    if (cycle === 'WEEKLY') return WEEKDAY_OPTIONS
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      return { value: String(day), label: dayOrdinal(day) }
    })
  }, [cycle])

  const canSubmit = useMemo(
    () =>
      occupancyId.trim().length > 0 &&
      amount.trim().length > 0 &&
      parseFloat(amount) > 0 &&
      dueDay.trim().length > 0 &&
      parseInt(dueDay) >= 1 &&
      parseInt(dueDay) <= (cycle === 'WEEKLY' ? 7 : 31) &&
      !isPending,
    [occupancyId, amount, dueDay, cycle, isPending]
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
    setIsLoading(true)
    startTransition(async () => {
      const [rentConfigsRes, occupanciesRes, unitsRes, tenantsRes, buildingsRes] = await Promise.all([
        listRentConfigs(orgSlug),
        listOccupancies(orgSlug),
        listUnits(orgSlug),
        listTenants(orgSlug),
        listBuildings(orgSlug),
      ])

      setIsLoading(false)
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
    const dueDayMax = cycle === 'WEEKLY' ? 7 : 31
    if (!dueDay || isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > dueDayMax) {
      setError(cycle === 'WEEKLY' ? 'Due weekday must be between 1 and 7.' : 'Due day must be between 1 and 31.')
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
          toast.error(res.error)
          return
        }
        const occupancyLabel = getOccupancyLabel(occupancyId.trim())
        resetForm()
        refresh()
        toast.success(`Rent schedule created for ${occupancyLabel}!`, {
          description: 'Next: generate rent periods to start tracking payments.',
        })
        return
      }

      if (!editingId) {
        toast.error('No rent schedule selected to edit.')
        return
      }

      const res = await updateRentConfig(orgSlug, editingId, {
        occupancy_id: occupancyId.trim(),
        amount: amountNum,
        cycle,
        due_day: dueDayNum,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Rent schedule updated successfully.')
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
    setDeleteDialog({ open: true, rentConfig: rc })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.rentConfig) return

    const rc = deleteDialog.rentConfig
    setError(null)
    setDeleteDialog({ open: false, rentConfig: null })
    startTransition(async () => {
      const res = await deleteRentConfig(orgSlug, rc.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === rc.id) resetForm()
      refresh()
      toast.success('Rent schedule deleted successfully.')
    })
  }


  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rent Schedules
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
                <CardTitle>Your rent schedules</CardTitle>
                <CardDescription className="mt-1">
                  Configure rent amounts, cycles, and due days for each occupancy.
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
              {/* Filter */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <div className="flex-1">
                  <Select
                    options={[{ value: '', label: 'All occupancies' }, ...occupancyOptions]}
                    value={
                      filterOccupancyId
                        ? occupancyOptions.find((o) => o.value === filterOccupancyId) ?? null
                        : { value: '', label: 'All occupancies' }
                    }
                    onChange={(opt) => {
                      setFilterOccupancyId(opt?.value || '')
                      setError(null)
                    }}
                    isDisabled={isPending}
                    placeholder="All occupancies"
                  />
                </div>
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
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRentConfigs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Wallet className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {occupancies.length === 0
                      ? 'Prerequisites needed'
                      : 'No rent schedules yet'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {occupancies.length === 0
                      ? 'Create occupancies first, then add rent schedules for them.'
                      : 'Create your first rent schedule to define payment terms.'}
                  </p>
                  {occupancies.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Use the form on the right to get started.
                    </p>
                  )}
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
                            <Wallet className="h-4 w-4 text-zinc-400" />
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
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === rc.id}
                          aria-label={`Edit rent schedule`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(rc)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.rentConfig?.id === rc.id}
                          aria-label={`Delete rent schedule`}
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
              <CardTitle>{mode === 'create' ? 'Add a rent schedule' : 'Edit rent schedule'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Define rent amount, cycle, and due day for an occupancy.'
                  : 'Update the rent schedule details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {occupancies.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>Create occupancies first before adding rent schedules.</p>
                </div>
              ) : (
                <>
                  <Select
                    label="Occupancy *"
                    options={occupancyOptions}
                    value={occupancyOptions.find((o) => o.value === occupancyId) ?? null}
                    onChange={(opt) => setOccupancyId(opt?.value || '')}
                    isDisabled={isPending}
                    placeholder="Select an occupancy"
                  />

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

                  <Select
                    label="Cycle *"
                    options={cycleOptions}
                    value={cycleOptions.find((o) => o.value === cycle) ?? null}
                    onChange={(opt) => {
                      setCycle((opt?.value || 'MONTHLY') as typeof cycle)
                      setDueDay('')
                    }}
                    isDisabled={isPending}
                  />

                  <Select
                    label={cycle === 'WEEKLY' ? 'Due weekday *' : 'Due day of month *'}
                    options={dueDayOptions}
                    value={dueDayOptions.find((o) => o.value === dueDay) ?? null}
                    onChange={(opt) => setDueDay(opt?.value || '')}
                    isDisabled={isPending}
                    placeholder={cycle === 'WEEKLY' ? 'Select weekday' : 'Select day'}
                    helperText={
                      cycle === 'WEEKLY'
                        ? 'The weekday rent is due for each weekly period.'
                        : "The day of the month rent is due. If it doesn't exist in a month (e.g., 31 in February), we use the last day of that month."
                    }
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onSubmit}
                      disabled={!canSubmit}
                      loading={isPending}
                      fullWidth
                    >
                      {mode === 'create' ? 'Create rent schedule' : 'Save changes'}
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

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, rentConfig: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete rent schedule"
        description={
          deleteDialog.rentConfig
            ? `Delete rent schedule for ${getOccupancyLabel(deleteDialog.rentConfig.occupancy_id)}? This will remove the rent schedule and may affect linked rent periods.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

