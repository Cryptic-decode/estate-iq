'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, Calendar, Pencil, Trash2, Filter, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createPayment, deletePayment, listPayments, updatePayment } from '@/app/actions/payments'
import { listRentPeriods } from '@/app/actions/rent-periods'
import { listRentConfigs } from '@/app/actions/rent-configs'
import { listOccupancies } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'
import { formatCurrency } from '@/lib/utils/currency'

type Payment = {
  id: string
  organization_id: string
  rent_period_id: string
  amount: number
  paid_at: string
  reference: string | null
  created_at: string
  updated_at: string
}

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

export function PaymentsManager({
  orgSlug,
  orgName,
  currency,
  initialPayments,
  initialRentPeriods,
  initialRentConfigs,
  initialOccupancies,
  initialUnits,
  initialTenants,
  initialBuildings,
  preselectedRentPeriodId,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialPayments: Payment[]
  initialRentPeriods: RentPeriod[]
  initialRentConfigs: RentConfig[]
  initialOccupancies: Occupancy[]
  initialUnits: Unit[]
  initialTenants: Tenant[]
  initialBuildings: Building[]
  preselectedRentPeriodId?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>(initialRentPeriods)
  const [rentConfigs, setRentConfigs] = useState<RentConfig[]>(initialRentConfigs)
  const [occupancies, setOccupancies] = useState<Occupancy[]>(initialOccupancies)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterRentPeriodId, setFilterRentPeriodId] = useState<SelectOption | null>(null)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [rentPeriodId, setRentPeriodId] = useState<SelectOption | null>(null)
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null,
  })

  // Helper functions (must be defined before useMemo hooks that use them)
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRentPeriodLabel = (rentPeriodId: string) => {
    const rentPeriod = rentPeriods.find((rp) => rp.id === rentPeriodId)
    if (!rentPeriod) return 'Unknown rent period'

    const rentConfig = rentConfigs.find((rc) => rc.id === rentPeriod.rent_config_id)
    if (!rentConfig) return `${formatDate(rentPeriod.period_start)} - ${formatDate(rentPeriod.period_end)}`

    const occupancy = occupancies.find((o) => o.id === rentConfig.occupancy_id)
    if (!occupancy) return `${formatDate(rentPeriod.period_start)} - ${formatDate(rentPeriod.period_end)}`

    const unit = units.find((u) => u.id === occupancy.unit_id)
    const tenant = tenants.find((t) => t.id === occupancy.tenant_id)
    const building = unit ? buildings.find((b) => b.id === unit.building_id) : null

    const unitLabel = unit && building ? `${building.name} - Unit ${unit.unit_number}` : 'Unknown unit'
    const tenantLabel = tenant?.full_name || 'Unknown tenant'
    const periodLabel = `${formatDate(rentPeriod.period_start)} - ${formatDate(rentPeriod.period_end)}`

    return `${tenantLabel} • ${unitLabel} • ${periodLabel}`
  }

  // Get available rent periods (DUE or OVERDUE, not already paid)
  const availableRentPeriods = useMemo(() => {
    return rentPeriods.filter((rp) => rp.status !== 'PAID')
  }, [rentPeriods])

  // Filter payments
  const filteredPayments = useMemo(() => {
    if (!filterRentPeriodId) return payments
    return payments.filter((p) => p.rent_period_id === filterRentPeriodId.value)
  }, [payments, filterRentPeriodId])

  // Options for Select components
  const rentPeriodFilterOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'All rent periods' },
      ...rentPeriods.map((rp) => ({ value: rp.id, label: getRentPeriodLabel(rp.id) })),
    ],
    [rentPeriods, rentConfigs, occupancies, units, tenants, buildings]
  )

  const availableRentPeriodOptions = useMemo<SelectOption[]>(
    () => availableRentPeriods.map((rp) => ({ value: rp.id, label: getRentPeriodLabel(rp.id) })),
    [availableRentPeriods, rentConfigs, occupancies, units, tenants, buildings]
  )

  const allRentPeriodOptions = useMemo<SelectOption[]>(
    () => rentPeriods.map((rp) => ({ value: rp.id, label: getRentPeriodLabel(rp.id) })),
    [rentPeriods, rentConfigs, occupancies, units, tenants, buildings]
  )

  const canSubmit = useMemo(
    () =>
      rentPeriodId &&
      rentPeriodId.value.trim().length > 0 &&
      amount.trim().length > 0 &&
      parseFloat(amount) > 0 &&
      paidAt.trim().length > 0 &&
      !isPending,
    [rentPeriodId, amount, paidAt, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setRentPeriodId(null)
    setAmount('')
    setPaidAt('')
    setReference('')
    setError(null)
  }

  const refresh = () => {
    setIsLoading(true)
    Promise.all([
      listPayments(orgSlug),
      listRentPeriods(orgSlug),
      listRentConfigs(orgSlug),
      listOccupancies(orgSlug),
      listUnits(orgSlug),
      listTenants(orgSlug),
      listBuildings(orgSlug),
    ])
      .then(([paymentsRes, rentPeriodsRes, rentConfigsRes, occupanciesRes, unitsRes, tenantsRes, buildingsRes]) => {
        if (paymentsRes.data) setPayments(paymentsRes.data)
        if (rentPeriodsRes.data) setRentPeriods(rentPeriodsRes.data)
        if (rentConfigsRes.data) setRentConfigs(rentConfigsRes.data)
        if (occupanciesRes.data) setOccupancies(occupanciesRes.data)
        if (unitsRes.data) setUnits(unitsRes.data)
        if (tenantsRes.data) setTenants(tenantsRes.data)
        if (buildingsRes.data) setBuildings(buildingsRes.data)
      })
      .catch((err) => {
        console.error('Error refreshing data:', err)
        toast.error('Failed to refresh data')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    // Set default paid_at to today if creating
    if (mode === 'create' && !paidAt) {
      const today = new Date().toISOString().split('T')[0]
      setPaidAt(today)
    }
  }, [mode, paidAt])

  // Pre-select rent period from URL parameter
  useEffect(() => {
    if (preselectedRentPeriodId && mode === 'create' && !rentPeriodId && rentPeriods.length > 0) {
      const period = rentPeriods.find((rp) => rp.id === preselectedRentPeriodId)
      if (period && period.status !== 'PAID') {
        const label = getRentPeriodLabel(period.id)
        setRentPeriodId({ value: period.id, label })
        // Auto-fill amount from rent config
        const rentConfig = rentConfigs.find((rc) => rc.id === period.rent_config_id)
        if (rentConfig) {
          setAmount(rentConfig.amount.toString())
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedRentPeriodId, mode])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      setError('Please fill in all required fields.')
      return
    }

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Amount must be greater than 0.')
      return
    }

    if (!paidAt) {
      setError('Payment date is required.')
      return
    }

    // Convert date to ISO string with time
    const paidAtDate = new Date(paidAt)
    if (isNaN(paidAtDate.getTime())) {
      setError('Invalid payment date.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        if (!rentPeriodId || !rentPeriodId.value) {
          setError('Rent period is required.')
          return
        }
        const res = await createPayment(orgSlug, {
          rent_period_id: rentPeriodId.value.trim(),
          amount: amountNum,
          paid_at: paidAtDate.toISOString(),
          reference: reference.trim() || undefined,
        })
        if (res.error) {
          toast.error(res.error)
          return
        }
        const rentPeriodLabel = getRentPeriodLabel(rentPeriodId.value.trim())
        resetForm()
        refresh()
        toast.success(`Payment recorded for ${rentPeriodLabel}!`, {
          description: 'Rent period has been marked as paid.',
        })
        return
      }

      if (!editingId) {
        toast.error('No payment selected to edit.')
        return
      }

      const res = await updatePayment(orgSlug, editingId, {
        amount: amountNum,
        paid_at: paidAtDate.toISOString(),
        reference: reference.trim() || undefined,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Payment updated successfully.')
    })
  }

  const onEdit = (payment: Payment) => {
    setMode('edit')
    setEditingId(payment.id)
    const rentPeriod = rentPeriods.find((rp) => rp.id === payment.rent_period_id)
    setRentPeriodId(rentPeriod ? { value: rentPeriod.id, label: getRentPeriodLabel(rentPeriod.id) } : null)
    setAmount(payment.amount.toString())
    setPaidAt(new Date(payment.paid_at).toISOString().split('T')[0])
    setReference(payment.reference || '')
    setError(null)
  }

  const onDelete = (payment: Payment) => {
    setDeleteDialog({ open: true, payment })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.payment) return

    const payment = deleteDialog.payment
    setError(null)
    setDeleteDialog({ open: false, payment: null })
    startTransition(async () => {
      const res = await deletePayment(orgSlug, payment.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === payment.id) resetForm()
      refresh()
      toast.success('Payment deleted successfully.', {
        description: 'Rent period status has been reverted if needed.',
      })
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Payments</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Record and track rent payments for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Payment records</CardTitle>
                <CardDescription className="mt-1">
                  View all recorded payments and their linked rent periods.
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
                <Filter className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="flex-1">
                  <Select
                    options={rentPeriodFilterOptions}
                    value={filterRentPeriodId}
                    onChange={(v) => {
                      setFilterRentPeriodId(v)
                      setError(null)
                    }}
                    isDisabled={isPending}
                    placeholder="All rent periods"
                    isClearable
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
              ) : filteredPayments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Receipt className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {rentPeriods.length === 0
                      ? 'Prerequisites needed'
                      : availableRentPeriods.length === 0
                        ? 'All rent periods paid'
                        : 'No payments recorded yet'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {rentPeriods.length === 0
                      ? 'Generate rent periods first, then record payments for them.'
                      : availableRentPeriods.length === 0
                        ? 'All rent periods have been paid. Generate new periods to record more payments.'
                        : 'Record your first payment using the form on the right.'}
                  </p>
                  {availableRentPeriods.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Use the form on the right to get started.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {getRentPeriodLabel(payment.rent_period_id)}
                          </span>
                          {editingId === payment.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium">{formatCurrency(payment.amount, currency)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <span>{formatDateTime(payment.paid_at)}</span>
                          </div>
                          {payment.reference && (
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-zinc-400" />
                              <span className="text-xs">Ref: {payment.reference}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(payment)}
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === payment.id}
                          aria-label={`Edit payment`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(payment)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.payment?.id === payment.id}
                          aria-label={`Delete payment`}
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
              <CardTitle>{mode === 'create' ? 'Record a payment' : 'Edit payment'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Record a payment for a rent period. This will mark the period as paid.'
                  : 'Update payment details. Note: rent period cannot be changed after creation.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableRentPeriods.length === 0 && mode === 'create' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>All rent periods are already paid. Generate new rent periods first.</p>
                </div>
              ) : (
                <>
                  <Select
                    label="Rent Period"
                    options={mode === 'create' ? availableRentPeriodOptions : allRentPeriodOptions}
                    value={rentPeriodId}
                    onChange={(v) => {
                      setRentPeriodId(v)
                      // Auto-fill amount from rent config if available
                      if (v && mode === 'create') {
                        const selectedRp = rentPeriods.find((rp) => rp.id === v.value)
                        if (selectedRp) {
                          const rentConfig = rentConfigs.find((rc) => rc.id === selectedRp.rent_config_id)
                          if (rentConfig) {
                            setAmount(rentConfig.amount.toString())
                          }
                        }
                      }
                    }}
                    isDisabled={isPending || mode === 'edit'}
                    placeholder="Select a rent period"
                    required
                  />

                  <Input
                    id="payment-amount"
                    label="Amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending}
                    required
                    placeholder="0.00"
                  />

                  <Input
                    id="payment-paid-at"
                    label="Paid At"
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    disabled={isPending}
                    required
                  />

                  <Input
                    id="payment-reference"
                    label="Reference (optional)"
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={isPending}
                    placeholder="Transaction ID, receipt number, etc."
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    loading={isPending}
                  >
                    {mode === 'create' ? 'Record payment' : 'Update payment'}
                  </Button>

                  {mode === 'edit' && (
                    <Button type="button" variant="secondary" fullWidth onClick={resetForm} disabled={isPending}>
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, payment: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete payment"
        description={
          deleteDialog.payment
            ? `Delete payment of ${formatCurrency(deleteDialog.payment.amount, currency)}? This will revert the rent period status if it was marked as paid.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={isPending}
      />
    </div>
  )
}
