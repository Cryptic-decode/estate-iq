'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { Download, MapPin, Pencil, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { EntryModeSwitch } from '@/components/app/entry-mode-switch'
import { PageHeader } from '@/components/app/page-header'
import { downloadExcelTemplate } from '@/lib/utils/excel-template'
import {
  createBuilding,
  deleteBuilding,
  importBuildingsFromXlsx,
  listBuildings,
  previewBuildingImport,
  updateBuilding,
} from '@/app/actions/buildings'

type Building = {
  id: string
  organization_id: string
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

type BuildingImportRowResult = {
  rowNumber: number
  name: string
  address: string
  status: 'valid' | 'invalid'
  error: string | null
}

type BuildingImportPreview = {
  rows: BuildingImportRowResult[]
  totalRows: number
  validCount: number
  invalidCount: number
}

export function BuildingsManager({
  orgSlug,
  orgName,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importValidation, setImportValidation] = useState<BuildingImportPreview | null>(null)
  const [isValidatingImport, setIsValidatingImport] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [entryMode, setEntryMode] = useState<'individual' | 'bulk'>('individual')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; building: Building | null }>({
    open: false,
    building: null,
  })

  const canSubmit = useMemo(
    () => name.trim().length > 0 && address.trim().length > 0 && !isPending,
    [name, address, isPending]
  )
  const invalidPreviewRows = useMemo(
    () => (importValidation?.rows ?? []).filter((row) => row.status === 'invalid'),
    [importValidation]
  )

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setName('')
    setAddress('')
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await listBuildings(orgSlug)
      setIsLoading(false)
      if (res.error) {
        toast.error(res.error)
        return
      }
      setBuildings(res.data ?? [])
    })
  }

  const onSubmit = () => {
    const trimmedName = name.trim()
    const trimmedAddress = address.trim()

    if (!trimmedName) {
      toast.error('Building name is required.')
      return
    }
    if (!trimmedAddress) {
      toast.error('Address is required.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createBuilding(orgSlug, {
          name: trimmedName,
          address: trimmedAddress,
        })
        if (res.error) {
          toast.error(res.error)
          return
        }
        resetForm()
        refresh()
        toast.success(`Building "${trimmedName}" created!`, {
          description: 'Next: create units for this building.',
        })
        return
      }

      if (!editingId) {
        toast.error('No building selected to edit.')
        return
      }

      const res = await updateBuilding(orgSlug, editingId, {
        name: trimmedName,
        address: trimmedAddress,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      resetForm()
      refresh()
      toast.success('Building updated successfully.')
    })
  }

  const onEdit = (b: Building) => {
    setMode('edit')
    setEditingId(b.id)
    setName(b.name)
    setAddress(b.address ?? '')
  }

  const onDelete = (b: Building) => {
    setDeleteDialog({ open: true, building: b })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.building) return

    const b = deleteDialog.building
    setDeleteDialog({ open: false, building: null })
    startTransition(async () => {
      const res = await deleteBuilding(orgSlug, b.id)
      if (res.error) {
        toast.error(res.error)
        return
      }
      if (editingId === b.id) resetForm()
      refresh()
      toast.success(`Building "${b.name}" deleted successfully.`)
    })
  }

  const onImportFileChange = (file: File | null) => {
    setImportFile(file)
    setImportValidation(null)
  }

  const onDownloadTemplate = () => {
    downloadExcelTemplate({
      filename: 'estateiq-buildings-sample.xlsx',
      sheetName: 'Buildings',
      headers: ['name', 'address'],
      examples: [
        ['Oceanview Apartments', '12 Palm Street, Victoria Island, Lagos'],
        ['Maple Heights', '45 Adeola Odeku, Lagos'],
      ],
      requiredHeaders: ['name', 'address'],
      notes: ['Building names must be unique within the organization.'],
    })
  }

  const onValidateImport = () => {
    if (!importFile) {
      toast.error('Select an .xlsx file first.')
      return
    }

    setIsValidatingImport(true)
    startTransition(async () => {
      const res = await previewBuildingImport(orgSlug, importFile)
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
      const res = await importBuildingsFromXlsx(orgSlug, importFile)
      setIsImporting(false)
      if (res.error) {
        if (res.data?.rows) {
          setImportValidation({
            rows: res.data.rows,
            totalRows: res.data.totalRows,
            validCount: res.data.rows.filter((r) => r.status === 'valid').length,
            invalidCount: res.data.rows.filter((r) => r.status === 'invalid').length,
          })
        }
        toast.error(res.error)
        return
      }
      if (!res.data) {
        toast.error('Import failed.')
        return
      }

      setImportFile(null)
      setImportValidation(null)
      refresh()
      toast.success(`Imported ${res.data.insertedCount} building(s) successfully.`)
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <PageHeader eyebrow="Portfolio" title="Buildings" description={`Manage the properties in ${orgName}.`} meta={`${buildings.length} ${buildings.length === 1 ? 'building' : 'buildings'}`} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your buildings</CardTitle>
                <CardDescription className="mt-1">
                  Keep this list tidy—units will attach to buildings.
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
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : buildings.length === 0 ? (
                <EmptyState
                  title="No buildings yet"
                  description="Create your first building to start adding units."
                  guidance="Use the form on this page to get started."
                />
              ) : (
                <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {buildings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-start justify-between gap-4 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {b.name}
                          </span>
                          {editingId === b.id && mode === 'edit' ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                              editing
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                          <MapPin className="h-4 w-4 text-zinc-400" />
                          <span className="truncate">
                            {b.address?.trim() ? b.address : 'No address'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onEdit(b)}
                          disabled={isPending || isLoading}
                          loading={isPending && editingId === b.id}
                          aria-label={`Edit ${b.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(b)}
                          disabled={isPending || isLoading}
                          loading={isPending && deleteDialog.building?.id === b.id}
                          aria-label={`Delete ${b.name}`}
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
              <CardTitle>{mode === 'create' ? 'Add buildings' : 'Edit building'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Add one building or upload a completed sample spreadsheet.'
                  : 'Update the building details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode === 'create' ? (
                <div className="space-y-4">
                  <EntryModeSwitch
                    value={entryMode}
                    onChange={setEntryMode}
                    disabled={isPending || isValidatingImport || isImporting}
                  />

                  {entryMode === 'individual' ? (
                    <div className="space-y-4">
                      <Input
                        id="building-name"
                        label="Building name"
                        placeholder="e.g., Oceanview Apartments"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isPending}
                      />
                      <Input
                        id="building-address"
                        label="Address"
                        placeholder="Street, city"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isPending}
                      />
                      <Button
                        variant="primary"
                        size="md"
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        loading={isPending}
                        fullWidth
                      >
                        Create building
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Upload a <span className="font-medium">.xlsx</span> file with headers:
                        <span className="font-medium"> name, address</span>.
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
                        id="building-import-file"
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
                          {invalidPreviewRows.length > 0 ? (
                            <div className="mt-2 space-y-1 text-xs text-red-700 dark:text-red-300">
                              {invalidPreviewRows.slice(0, 5).map((row) => (
                                <p key={`${row.rowNumber}-${row.name}`}>
                                  Row {row.rowNumber}: {row.error}
                                </p>
                              ))}
                              {invalidPreviewRows.length > 5 ? (
                                <p>...and {invalidPreviewRows.length - 5} more error(s).</p>
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
                  <Input
                    id="building-name"
                    label="Building name"
                    placeholder="e.g., Oceanview Apartments"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isPending}
                  />
                  <Input
                    id="building-address"
                    label="Address"
                    placeholder="Street, city"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isPending}
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
        onClose={() => setDeleteDialog({ open: false, building: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete building"
        description={
          deleteDialog.building
            ? `Delete "${deleteDialog.building.name}"? This will remove the building and may affect linked units.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}
