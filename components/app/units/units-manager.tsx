'use client'

import { useMemo, useState, useTransition, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Building2, Pencil, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createUnit, deleteUnit, listUnits, updateUnit } from '@/app/actions/units'
import { listBuildings } from '@/app/actions/buildings'

type Unit = {
  id: string
  organization_id: string
  building_id: string
  unit_number: string
  created_at: string
  updated_at: string
}

type Building = {
  id: string
  name: string
  address: string | null
}

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } },
}

export function UnitsManager({
  orgSlug,
  orgName,
  initialUnits,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  initialUnits: Unit[]
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [units, setUnits] = useState<Unit[]>(initialUnits)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)
  const [filterBuildingId, setFilterBuildingId] = useState<string>('')

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [buildingId, setBuildingId] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; unit: Unit | null }>({
    open: false,
    unit: null,
  })

  // Filter units by building
  const filteredUnits = useMemo(() => {
    if (!filterBuildingId) return units
    return units.filter((u) => u.building_id === filterBuildingId)
  }, [units, filterBuildingId])

  // Get building name for a unit
  const getBuildingName = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId)
    return building?.name || 'Unknown building'
  }

  const canSubmit = useMemo(
    () => buildingId.trim().length > 0 && unitNumber.trim().length > 0 && !isPending,
    [buildingId, unitNumber, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setBuildingId('')
    setUnitNumber('')
    setError(null)
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const [unitsRes, buildingsRes] = await Promise.all([
        listUnits(orgSlug),
        listBuildings(orgSlug),
      ])

      setIsLoading(false)
      if (unitsRes.error) {
        toast.error(unitsRes.error)
        return
      }
      if (buildingsRes.error) {
        toast.error(buildingsRes.error)
        return
      }

      setUnits(unitsRes.data ?? [])
      setBuildings(buildingsRes.data ?? [])
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const onSubmit = () => {
    setError(null)
    const trimmedBuildingId = buildingId.trim()
    const trimmedUnitNumber = unitNumber.trim()

    if (!trimmedBuildingId) {
      setError('Building is required.')
      return
    }

    if (!trimmedUnitNumber) {
      setError('Unit number is required.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createUnit(orgSlug, {
          building_id: trimmedBuildingId,
          unit_number: trimmedUnitNumber,
        })
        if (res.error) {
          toast.error(res.error)
          return
        }
        resetForm()
        refresh()
        toast.success(`Unit "${trimmedUnitNumber}" created!`, {
          description: 'Next: add tenants and create occupancies to assign them to this unit.',
        })
        return
      }

      if (!editingId) {
        toast.error('No unit selected to edit.')
        return
      }

      const res = await updateUnit(orgSlug, editingId, {
        building_id: trimmedBuildingId,
        unit_number: trimmedUnitNumber,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Unit updated successfully.')
    })
  }

  const onEdit = (u: Unit) => {
    setMode('edit')
    setEditingId(u.id)
    setBuildingId(u.building_id)
    setUnitNumber(u.unit_number)
    setError(null)
  }

  const onDelete = (u: Unit) => {
    setDeleteDialog({ open: true, unit: u })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.unit) return

    const u = deleteDialog.unit
    const buildingName = getBuildingName(u.building_id)
    setError(null)
    setDeleteDialog({ open: false, unit: null })
    startTransition(async () => {
      const res = await deleteUnit(orgSlug, u.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === u.id) resetForm()
      refresh()
      toast.success(`Unit "${u.unit_number}" deleted successfully.`)
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Units
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Manage units for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle>Your units</CardTitle>
                <CardDescription className="mt-1">
                  Manage units across buildings. Filter by building to focus on specific locations.
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
              {/* Building Filter */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
                <Filter className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <select
                  value={filterBuildingId}
                  onChange={(e) => {
                    setFilterBuildingId(e.target.value)
                    setError(null)
                  }}
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                  disabled={isPending}
                >
                  <option value="">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
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

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Home className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {filterBuildingId
                      ? 'No units in this building'
                      : buildings.length === 0
                        ? 'No buildings yet'
                        : 'No units yet'}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {filterBuildingId
                      ? 'Create your first unit for this building.'
                      : buildings.length === 0
                        ? 'Create a building first, then add units.'
                        : 'Create your first unit to get started.'}
                  </p>
                  {buildings.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Use the form on the right to get started.
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {filteredUnits.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            Unit {u.unit_number}
                          </span>
                          {editingId === u.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <Building2 className="h-4 w-4 text-zinc-400" />
                          <span className="truncate">{getBuildingName(u.building_id)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(u)}
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === u.id}
                          aria-label={`Edit unit ${u.unit_number}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(u)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.unit?.id === u.id}
                          aria-label={`Delete unit ${u.unit_number}`}
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
              <CardTitle>{mode === 'create' ? 'Add a unit' : 'Edit unit'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Create a unit record and assign it to a building.'
                  : 'Update the unit details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildings.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>Create a building first before adding units.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="unit-building"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Building <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="unit-building"
                      value={buildingId}
                      onChange={(e) => setBuildingId(e.target.value)}
                      disabled={isPending}
                      className="mt-1.5 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
                    >
                      <option value="">Select a building</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    id="unit-number"
                    label="Unit number"
                    placeholder="e.g., 101, A-5, Suite 200"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    disabled={isPending}
                    required
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
                      {mode === 'create' ? 'Create unit' : 'Save changes'}
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
        onClose={() => setDeleteDialog({ open: false, unit: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete unit"
        description={
          deleteDialog.unit
            ? `Delete unit "${deleteDialog.unit.unit_number}" from ${getBuildingName(deleteDialog.unit.building_id)}? This will remove the unit and may affect linked occupancies.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}

