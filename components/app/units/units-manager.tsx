'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Building2, Pencil, Trash2, Filter, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { EntryModeSwitch } from '@/components/app/entry-mode-switch'
import { PageHeader } from '@/components/app/page-header'
import { downloadExcelTemplate } from '@/lib/utils/excel-template'
import {
  createUnit,
  deleteUnit,
  importUnitsFromXlsx,
  listUnits,
  updateUnit,
  validateUnitsImport,
} from '@/app/actions/units'
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

type UnitImportRowResult = {
  rowNumber: number
  building_name: string
  unit_number: string
  status: 'valid' | 'invalid'
  error: string | null
}

type UnitImportValidation = {
  rows: UnitImportRowResult[]
  totalRows: number
  validCount: number
  invalidCount: number
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
  const [filterBuildingId, setFilterBuildingId] = useState<SelectOption | null>(null)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [entryMode, setEntryMode] = useState<'individual' | 'bulk'>('individual')

  const [buildingId, setBuildingId] = useState<SelectOption | null>(null)
  const [unitNumber, setUnitNumber] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importValidation, setImportValidation] = useState<UnitImportValidation | null>(null)
  const [isValidatingImport, setIsValidatingImport] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; unit: Unit | null }>({
    open: false,
    unit: null,
  })

  // Filter units by building
  const filteredUnits = useMemo(() => {
    if (!filterBuildingId) return units
    return units.filter((u) => u.building_id === filterBuildingId.value)
  }, [units, filterBuildingId])

  // Building options for Select
  const buildingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'All buildings' },
      ...buildings.map((b) => ({ value: b.id, label: b.name })),
    ],
    [buildings]
  )

  const formBuildingOptions = useMemo<SelectOption[]>(
    () => buildings.map((b) => ({ value: b.id, label: b.name })),
    [buildings]
  )

  // Get building name for a unit
  const getBuildingName = (buildingId: string) => {
    const building = buildings.find((b) => b.id === buildingId)
    return building?.name || 'Unknown building'
  }

  const canSubmit = useMemo(
    () => buildingId && buildingId.value.trim().length > 0 && unitNumber.trim().length > 0 && !isPending,
    [buildingId, unitNumber, isPending]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setBuildingId(null)
    setUnitNumber('')
  }

  const invalidImportRows = useMemo(
    () => (importValidation?.rows ?? []).filter((row) => row.status === 'invalid'),
    [importValidation]
  )

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

  const onSubmit = () => {
    if (!buildingId || !buildingId.value) {
      toast.error('Building is required.')
      return
    }
    const trimmedBuildingId = buildingId.value.trim()
    const trimmedUnitNumber = unitNumber.trim()

    if (!trimmedUnitNumber) {
      toast.error('Unit number is required.')
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
    const building = buildings.find((b) => b.id === u.building_id)
    setBuildingId(building ? { value: building.id, label: building.name } : null)
    setUnitNumber(u.unit_number)
  }

  const onDelete = (u: Unit) => {
    setDeleteDialog({ open: true, unit: u })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.unit) return

    const u = deleteDialog.unit
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

  const onImportFileChange = (file: File | null) => {
    setImportFile(file)
    setImportValidation(null)
  }

  const onDownloadTemplate = () => {
    downloadExcelTemplate({
      filename: 'estateiq-units-sample.xlsx',
      sheetName: 'Units',
      headers: ['building_name', 'unit_number'],
      examples: [
        ['Oceanview Apartments', '101'],
        ['Oceanview Apartments', '102'],
        ['Maple Heights', 'A-05'],
      ],
      requiredHeaders: ['building_name', 'unit_number'],
      notes: [
        'Building names must exactly match buildings already created in EstateIQ.',
        'Unit numbers must be unique within each building.',
      ],
    })
  }

  const onValidateImport = () => {
    if (!importFile) {
      toast.error('Select an .xlsx file first.')
      return
    }

    setIsValidatingImport(true)
    startTransition(async () => {
      const res = await validateUnitsImport(orgSlug, importFile)
      setIsValidatingImport(false)
      if (res.error || !res.data) {
        toast.error(res.error ?? 'Failed to validate file')
        setImportValidation(null)
        return
      }
      setImportValidation(res.data)
      if (res.data.invalidCount > 0) {
        toast.warning('Validation completed with errors.')
        return
      }
      toast.success('Validation completed. Ready to import.')
    })
  }

  const onRunImport = () => {
    if (!importFile) {
      toast.error('Select an .xlsx file first.')
      return
    }

    setIsImporting(true)
    startTransition(async () => {
      const res = await importUnitsFromXlsx(orgSlug, importFile)
      setIsImporting(false)
      if (res.error) {
        toast.error(res.error)
        if (res.data?.rows) {
          setImportValidation({
            rows: res.data.rows,
            totalRows: res.data.totalRows,
            validCount: res.data.rows.filter((r) => r.status === 'valid').length,
            invalidCount: res.data.rows.filter((r) => r.status === 'invalid').length,
          })
        }
        return
      }
      if (!res.data) {
        toast.error('Import failed.')
        return
      }

      setImportFile(null)
      setImportValidation(null)
      refresh()
      toast.success(`Imported ${res.data.insertedCount} unit(s) successfully.`)
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <PageHeader eyebrow="Portfolio" title="Units" description={`Manage rentable units across ${orgName}.`} meta={`${units.length} ${units.length === 1 ? 'unit' : 'units'} across ${buildings.length} ${buildings.length === 1 ? 'building' : 'buildings'}`} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                <Filter className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <div className="flex-1">
                  <Select
                    options={buildingOptions}
                  value={filterBuildingId}
                    onChange={(v) => {
                      setFilterBuildingId(v)
                    }}
                    isDisabled={isPending}
                    placeholder="All buildings"
                    isClearable
                  />
                </div>
              </div>

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
                <EmptyState
                  title={
                    filterBuildingId
                      ? 'No units in this building'
                      : buildings.length === 0
                        ? 'No buildings yet'
                        : 'No units yet'
                  }
                  description={
                    filterBuildingId
                      ? 'Create the first unit for this building.'
                      : buildings.length === 0
                        ? 'Create a building first, then add its units.'
                        : 'Create your first unit to get started.'
                  }
                  guidance={buildings.length > 0 ? 'Use the form on this page to get started.' : undefined}
                />
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
              <CardTitle>{mode === 'create' ? 'Add units' : 'Edit unit'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Add one unit or upload a completed sample spreadsheet.'
                  : 'Update the unit details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildings.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>Create a building first before adding units.</p>
                </div>
              ) : mode === 'create' ? (
                <div className="space-y-4">
                  <EntryModeSwitch
                    value={entryMode}
                    onChange={setEntryMode}
                    disabled={isPending || isValidatingImport || isImporting}
                  />

                  {entryMode === 'individual' ? (
                    <div className="space-y-4">
                      <Select
                        label="Building"
                        options={formBuildingOptions}
                        value={buildingId}
                        onChange={(v) => setBuildingId(v)}
                        isDisabled={isPending}
                        placeholder="Select a building"
                        required
                      />

                      <Input
                        id="unit-number"
                        label="Unit number"
                        placeholder="e.g., 101, A-5, Suite 200"
                        value={unitNumber}
                        onChange={(e) => setUnitNumber(e.target.value)}
                        disabled={isPending}
                        required
                      />

                      <Button
                        variant="primary"
                        size="md"
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        loading={isPending}
                        fullWidth
                      >
                        Create unit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Upload a <span className="font-medium">.xlsx</span> file with required headers:
                        <span className="font-medium"> building_name, unit_number</span>.
                      </p>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={onDownloadTemplate}
                        disabled={isPending || isValidatingImport || isImporting}
                        fullWidth
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download sample sheet
                      </Button>

                      <Input
                        id="units-import-file"
                        label="Excel file (.xlsx)"
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => onImportFileChange(e.target.files?.[0] ?? null)}
                        disabled={isPending || isValidatingImport || isImporting}
                      />

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={onValidateImport}
                          disabled={!importFile || isPending || isValidatingImport || isImporting}
                          loading={isValidatingImport}
                          fullWidth
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Validate file
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={onRunImport}
                          disabled={
                            !importFile ||
                            !importValidation ||
                            importValidation.invalidCount > 0 ||
                            isPending ||
                            isValidatingImport ||
                            isImporting
                          }
                          loading={isImporting}
                          fullWidth
                        >
                          Import
                        </Button>
                      </div>

                      {importValidation ? (
                        <div className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                          <div className="text-zinc-700 dark:text-zinc-200">
                            Rows: <span className="font-medium">{importValidation.totalRows}</span> | Valid:{' '}
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {importValidation.validCount}
                            </span>{' '}
                            | Invalid:{' '}
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {importValidation.invalidCount}
                            </span>
                          </div>
                          {invalidImportRows.length > 0 ? (
                            <div className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
                              {invalidImportRows.slice(0, 5).map((row) => (
                                <p key={`${row.rowNumber}-${row.building_name}-${row.unit_number}`}>
                                  Row {row.rowNumber}: {row.error}
                                </p>
                              ))}
                              {invalidImportRows.length > 5 ? (
                                <p>...and {invalidImportRows.length - 5} more error(s).</p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                              All rows are valid. You can run import now.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    label="Building"
                    options={formBuildingOptions}
                    value={buildingId}
                    onChange={(v) => setBuildingId(v)}
                    isDisabled={isPending}
                    placeholder="Select a building"
                    required
                  />

                  <Input
                    id="unit-number"
                    label="Unit number"
                    placeholder="e.g., 101, A-5, Suite 200"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    disabled={isPending}
                    required
                  />

                  <Button
                    variant="primary"
                    size="md"
                    onClick={onSubmit}
                    disabled={!canSubmit}
                    loading={isPending}
                    fullWidth
                  >
                    Save changes
                  </Button>

                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={resetForm}
                    disabled={isPending}
                    className="w-full"
                  >
                    Cancel editing
                  </Button>
                </div>
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
