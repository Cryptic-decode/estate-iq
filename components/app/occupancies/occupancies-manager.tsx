'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Home, Users, Calendar, Pencil, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, type SelectOption } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createOccupancy, deleteOccupancy, listOccupancies, updateOccupancy } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'

type Occupancy = {
  id: string
  organization_id: string
  unit_id: string
  tenant_id: string
  active_from: string
  active_to: string | null
  created_at: string
  updated_at: string
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

export function OccupanciesManager({
  orgSlug,
  orgName,
  initialOccupancies,
  initialUnits,
  initialTenants,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  initialOccupancies: Occupancy[]
  initialUnits: Unit[]
  initialTenants: Tenant[]
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [occupancies, setOccupancies] = useState<Occupancy[]>(initialOccupancies)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterUnitId, setFilterUnitId] = useState<SelectOption | null>(null)
  const [filterTenantId, setFilterTenantId] = useState<SelectOption | null>(null)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [unitId, setUnitId] = useState<SelectOption | null>(null)
  const [tenantId, setTenantId] = useState<SelectOption | null>(null)
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; occupancy: Occupancy | null }>({
    open: false,
    occupancy: null,
  })

  // Filter occupancies
  const filteredOccupancies = useMemo(() => {
    let filtered = occupancies
    if (filterUnitId) {
      filtered = filtered.filter((o) => o.unit_id === filterUnitId.value)
    }
    if (filterTenantId) {
      filtered = filtered.filter((o) => o.tenant_id === filterTenantId.value)
    }
    return filtered
  }, [occupancies, filterUnitId, filterTenantId])

  // Options for Select components
  const unitOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'All units' },
      ...units.map((u) => ({ value: u.id, label: getUnitName(u.id) })),
    ],
    [units, buildings]
  )

  const tenantOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'All tenants' },
      ...tenants.map((t) => ({ value: t.id, label: t.full_name })),
    ],
    [tenants]
  )

  const formUnitOptions = useMemo<SelectOption[]>(
    () => units.map((u) => ({ value: u.id, label: getUnitName(u.id) })),
    [units, buildings]
  )

  const formTenantOptions = useMemo<SelectOption[]>(
    () => tenants.map((t) => ({ value: t.id, label: t.full_name })),
    [tenants]
  )

  // Helper functions
  const getUnitName = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId)
    if (!unit) return 'Unknown unit'
    const building = buildings.find((b) => b.id === unit.building_id)
    return building ? `${building.name} - Unit ${unit.unit_number}` : `Unit ${unit.unit_number}`
  }

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    return tenant?.full_name || 'Unknown tenant'
  }

  const canSubmit = useMemo(
    () =>
      unitId &&
      unitId.value.trim().length > 0 &&
      tenantId &&
      tenantId.value.trim().length > 0 &&
      activeFrom.trim().length > 0 &&
      !isPending,
    [unitId, tenantId, activeFrom, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setUnitId(null)
    setTenantId(null)
    setActiveFrom('')
    setActiveTo('')
    setError(null)
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const [occupanciesRes, unitsRes, tenantsRes, buildingsRes] = await Promise.all([
        listOccupancies(orgSlug),
        listUnits(orgSlug),
        listTenants(orgSlug),
        listBuildings(orgSlug),
      ])

      setIsLoading(false)
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

    if (!unitId || !unitId.value.trim()) {
      setError('Unit is required.')
      return
    }

    if (!tenantId || !tenantId.value.trim()) {
      setError('Tenant is required.')
      return
    }

    if (!activeFrom.trim()) {
      setError('Active from date is required.')
      return
    }

    if (activeTo && new Date(activeTo) < new Date(activeFrom)) {
      setError('Active to date must be after or equal to active from date.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createOccupancy(orgSlug, {
          unit_id: unitId.value.trim(),
          tenant_id: tenantId.value.trim(),
          active_from: activeFrom,
          active_to: activeTo.trim() || null,
        })
        if (res.error) {
          toast.error(res.error)
          return
        }
        const unitName = getUnitName(unitId.value.trim())
        const tenantName = getTenantName(tenantId.value.trim())
        resetForm()
        refresh()
        toast.success('Occupancy created!', {
          description: `${tenantName} is now assigned to ${unitName}. Next: create a rent schedule for this occupancy.`,
        })
        return
      }

      if (!editingId) {
        toast.error('No occupancy selected to edit.')
        return
      }

      const res = await updateOccupancy(orgSlug, editingId, {
        unit_id: unitId.value.trim(),
        tenant_id: tenantId.value.trim(),
        active_from: activeFrom,
        active_to: activeTo.trim() || null,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Occupancy updated successfully.')
    })
  }

  const onEdit = (o: Occupancy) => {
    setMode('edit')
    setEditingId(o.id)
    const unit = units.find((u) => u.id === o.unit_id)
    const tenant = tenants.find((t) => t.id === o.tenant_id)
    setUnitId(unit ? { value: unit.id, label: getUnitName(unit.id) } : null)
    setTenantId(tenant ? { value: tenant.id, label: tenant.full_name } : null)
    setActiveFrom(o.active_from)
    setActiveTo(o.active_to || '')
    setError(null)
  }

  const onDelete = (o: Occupancy) => {
    setDeleteDialog({ open: true, occupancy: o })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.occupancy) return

    const o = deleteDialog.occupancy
    const unitName = getUnitName(o.unit_id)
    const tenantName = getTenantName(o.tenant_id)
    setError(null)
    setDeleteDialog({ open: false, occupancy: null })
    startTransition(async () => {
      const res = await deleteOccupancy(orgSlug, o.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === o.id) resetForm()
      refresh()
      toast.success('Occupancy deleted successfully.')
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isActive = (occupancy: Occupancy) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fromDate = new Date(occupancy.active_from)
    fromDate.setHours(0, 0, 0, 0)
    const toDate = occupancy.active_to ? new Date(occupancy.active_to) : null
    if (toDate) toDate.setHours(0, 0, 0, 0)

    return fromDate <= today && (!toDate || toDate >= today)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Occupancies
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Assign tenants to units for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your occupancies</CardTitle>
                <CardDescription className="mt-1">
                  Manage lease assignments. Link tenants to units with date ranges.
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
            {/* Filters */}
            <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row">
              <div className="flex flex-1 items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="flex-1">
                  <Select
                    options={unitOptions}
                    value={filterUnitId}
                    onChange={(v) => {
                      setFilterUnitId(v)
                      setError(null)
                    }}
                    isDisabled={isPending}
                    placeholder="All units"
                    isClearable
                  />
                </div>
              </div>
              <div className="flex-1">
                <Select
                  options={tenantOptions}
                  value={filterTenantId}
                  onChange={(v) => {
                    setFilterTenantId(v)
                    setError(null)
                  }}
                  isDisabled={isPending}
                  placeholder="All tenants"
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
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredOccupancies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <FileText className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {units.length === 0 || tenants.length === 0
                      ? 'Prerequisites needed'
                      : 'No occupancies yet'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {units.length === 0 || tenants.length === 0
                      ? 'Create units and tenants first, then assign them via occupancies.'
                      : 'Create your first occupancy to assign a tenant to a unit.'}
                  </p>
                  {units.length > 0 && tenants.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Use the form on the right to get started.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {filteredOccupancies.map((o) => (
                    <div
                      key={o.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {getTenantName(o.tenant_id)}
                          </span>
                          {isActive(o) && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              active
                            </span>
                          )}
                          {editingId === o.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-zinc-400" />
                            <span className="truncate">{getUnitName(o.unit_id)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <span>
                              {formatDate(o.active_from)}
                              {o.active_to ? ` - ${formatDate(o.active_to)}` : ' (ongoing)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(o)}
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === o.id}
                          aria-label={`Edit occupancy`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(o)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.occupancy?.id === o.id}
                          aria-label={`Delete occupancy`}
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
              <CardTitle>{mode === 'create' ? 'Add an occupancy' : 'Edit occupancy'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Assign a tenant to a unit with a date range.'
                  : 'Update the occupancy details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {units.length === 0 || tenants.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>
                    {units.length === 0 && tenants.length === 0
                      ? 'Create units and tenants first before adding occupancies.'
                      : units.length === 0
                        ? 'Create units first before adding occupancies.'
                        : 'Create tenants first before adding occupancies.'}
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    label="Unit"
                    options={formUnitOptions}
                    value={unitId}
                    onChange={(v) => setUnitId(v)}
                    isDisabled={isPending}
                    placeholder="Select a unit"
                    required
                  />

                  <Select
                    label="Tenant"
                    options={formTenantOptions}
                    value={tenantId}
                    onChange={(v) => setTenantId(v)}
                    isDisabled={isPending}
                    placeholder="Select a tenant"
                    required
                  />

                  <div>
                    <label
                      htmlFor="occupancy-active-from"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Active from <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="occupancy-active-from"
                      type="date"
                      value={activeFrom}
                      onChange={(e) => setActiveFrom(e.target.value)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="occupancy-active-to"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Active to (optional)
                    </label>
                    <input
                      id="occupancy-active-to"
                      type="date"
                      value={activeTo}
                      onChange={(e) => setActiveTo(e.target.value)}
                      disabled={isPending}
                      min={activeFrom || undefined}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Leave empty for ongoing occupancy
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={onSubmit}
                      disabled={!canSubmit}
                      loading={isPending}
                      fullWidth
                    >
                      {mode === 'create' ? 'Create occupancy' : 'Save changes'}
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
        onClose={() => setDeleteDialog({ open: false, occupancy: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete occupancy"
        description={
          deleteDialog.occupancy
            ? `Delete occupancy for ${getTenantName(deleteDialog.occupancy.tenant_id)} in ${getUnitName(deleteDialog.occupancy.unit_id)}? This will remove the lease assignment.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

