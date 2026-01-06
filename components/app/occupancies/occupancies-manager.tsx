'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Home, Users, Calendar, Pencil, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } },
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
  const [occupancies, setOccupancies] = useState<Occupancy[]>(initialOccupancies)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterUnitId, setFilterUnitId] = useState<string>('')
  const [filterTenantId, setFilterTenantId] = useState<string>('')

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [unitId, setUnitId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Filter occupancies
  const filteredOccupancies = useMemo(() => {
    let filtered = occupancies
    if (filterUnitId) {
      filtered = filtered.filter((o) => o.unit_id === filterUnitId)
    }
    if (filterTenantId) {
      filtered = filtered.filter((o) => o.tenant_id === filterTenantId)
    }
    return filtered
  }, [occupancies, filterUnitId, filterTenantId])

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
      unitId.trim().length > 0 &&
      tenantId.trim().length > 0 &&
      activeFrom.trim().length > 0 &&
      !isPending,
    [unitId, tenantId, activeFrom, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setUnitId('')
    setTenantId('')
    setActiveFrom('')
    setActiveTo('')
    setError(null)
  }

  const refresh = () => {
    startTransition(async () => {
      const filters: { unitId?: string; tenantId?: string } = {}
      if (filterUnitId) filters.unitId = filterUnitId
      if (filterTenantId) filters.tenantId = filterTenantId

      const [occupanciesRes, unitsRes, tenantsRes, buildingsRes] = await Promise.all([
        listOccupancies(orgSlug, Object.keys(filters).length > 0 ? filters : undefined),
        listUnits(orgSlug),
        listTenants(orgSlug),
        listBuildings(orgSlug),
      ])

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

      setOccupancies(occupanciesRes.data ?? [])
      setUnits(unitsRes.data ?? [])
      setTenants(tenantsRes.data ?? [])
      setBuildings(buildingsRes.data ?? [])
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUnitId, filterTenantId])

  const onSubmit = () => {
    setError(null)

    if (!unitId.trim()) {
      setError('Unit is required.')
      return
    }

    if (!tenantId.trim()) {
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
          unit_id: unitId.trim(),
          tenant_id: tenantId.trim(),
          active_from: activeFrom,
          active_to: activeTo.trim() || null,
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
        setError('No occupancy selected to edit.')
        return
      }

      const res = await updateOccupancy(orgSlug, editingId, {
        unit_id: unitId.trim(),
        tenant_id: tenantId.trim(),
        active_from: activeFrom,
        active_to: activeTo.trim() || null,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      resetForm()
      refresh()
    })
  }

  const onEdit = (o: Occupancy) => {
    setMode('edit')
    setEditingId(o.id)
    setUnitId(o.unit_id)
    setTenantId(o.tenant_id)
    setActiveFrom(o.active_from)
    setActiveTo(o.active_to || '')
    setError(null)
  }

  const onDelete = (o: Occupancy) => {
    const unitName = getUnitName(o.unit_id)
    const tenantName = getTenantName(o.tenant_id)
    const ok = window.confirm(
      `Delete occupancy for ${tenantName} in ${unitName}? This will remove the lease assignment.`
    )
    if (!ok) return

    setError(null)
    startTransition(async () => {
      const res = await deleteOccupancy(orgSlug, o.id)
      if (res.error) {
        setError(res.error)
        return
      }
      if (editingId === o.id) resetForm()
      refresh()
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
                disabled={isPending}
                className="shrink-0"
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filters */}
              <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row">
                <div className="flex flex-1 items-center gap-2">
                  <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <select
                    value={filterUnitId}
                    onChange={(e) => setFilterUnitId(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    disabled={isPending}
                  >
                    <option value="">All units</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {getUnitName(u.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={filterTenantId}
                  onChange={(e) => setFilterTenantId(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  disabled={isPending}
                >
                  <option value="">All tenants</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
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

              {filteredOccupancies.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {units.length === 0 || tenants.length === 0
                      ? 'Create units and tenants first, then assign them via occupancies.'
                      : 'No occupancies yet. Create your first occupancy to assign a tenant to a unit.'}
                  </p>
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
                          disabled={isPending}
                          aria-label={`Edit occupancy`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(o)}
                          disabled={isPending}
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
                  <div>
                    <label
                      htmlFor="occupancy-unit"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="occupancy-unit"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    >
                      <option value="">Select a unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {getUnitName(u.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="occupancy-tenant"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Tenant <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="occupancy-tenant"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    >
                      <option value="">Select a tenant</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      fullWidth
                    >
                      {isPending
                        ? 'Saving...'
                        : mode === 'create'
                          ? 'Create occupancy'
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

