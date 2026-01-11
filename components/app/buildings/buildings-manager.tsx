'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createBuilding, deleteBuilding, listBuildings, updateBuilding } from '@/app/actions/buildings'

type Building = {
  id: string
  organization_id: string
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
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
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; building: Building | null }>({
    open: false,
    building: null,
  })

  const canSubmit = useMemo(() => name.trim().length > 0 && !isPending, [name, isPending])

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setName('')
    setAddress('')
    setError(null)
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
    setError(null)
    const trimmedName = name.trim()
    const trimmedAddress = address.trim()

    if (!trimmedName) {
      setError('Building name is required.')
      return
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createBuilding(orgSlug, {
          name: trimmedName,
          address: trimmedAddress || undefined,
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
        address: trimmedAddress || undefined,
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
    setError(null)
  }

  const onDelete = (b: Building) => {
    setDeleteDialog({ open: true, building: b })
  }

  const handleDeleteConfirm = () => {
    if (!deleteDialog.building) return

    const b = deleteDialog.building
    setError(null)
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Buildings
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Manage buildings for <span className="font-medium">{orgName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : buildings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <Building2 className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    No buildings yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Create your first building to start adding units.
                  </p>
                  <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                    Use the form on the right to get started.
                  </p>
                </div>
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
              <CardTitle>{mode === 'create' ? 'Add a building' : 'Edit building'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Create a building record for this organization.'
                  : 'Update the building details. Changes save immediately.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                label="Address (optional)"
                placeholder="Street, city"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isPending}
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
                  {mode === 'create' ? 'Create building' : 'Save changes'}
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


