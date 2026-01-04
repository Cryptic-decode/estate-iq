'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12, ease: 'easeIn' } },
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
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings)

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => name.trim().length > 0 && !isPending, [name, isPending])

  const resetForm = () => {
    setMode('create')
    setEditingId(null)
    setName('')
    setAddress('')
    setError(null)
  }

  const refresh = () => {
    startTransition(async () => {
      const res = await listBuildings(orgSlug)
      if (res.error) {
        setError(res.error)
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
          setError(res.error)
          return
        }
        resetForm()
        refresh()
        return
      }

      if (!editingId) {
        setError('No building selected to edit.')
        return
      }

      const res = await updateBuilding(orgSlug, editingId, {
        name: trimmedName,
        address: trimmedAddress || undefined,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      resetForm()
      refresh()
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
    const ok = window.confirm(
      `Delete "${b.name}"? This will remove the building and may affect linked units.`
    )
    if (!ok) return

    setError(null)
    startTransition(async () => {
      const res = await deleteBuilding(orgSlug, b.id)
      if (res.error) {
        setError(res.error)
        return
      }
      if (editingId === b.id) resetForm()
      refresh()
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <div className="mb-8 flex flex-col gap-2">
          <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Building2 className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Buildings</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Manage buildings for <span className="font-medium">{orgName}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Your buildings</CardTitle>
                <CardDescription>Keep this list tidy—units will attach to buildings.</CardDescription>
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

              {buildings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    No buildings yet. Create your first building to start adding units.
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
                          disabled={isPending}
                          aria-label={`Edit ${b.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDelete(b)}
                          disabled={isPending}
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
                  fullWidth
                >
                  {isPending
                    ? 'Saving...'
                    : mode === 'create'
                      ? 'Create building'
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
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}


