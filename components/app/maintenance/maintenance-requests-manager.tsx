'use client'

import { useMemo, useState, useTransition } from 'react'
import { AlertTriangle, Bolt, Clock3, Droplets, ShieldAlert, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import {
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  listMaintenanceRequests,
  updateMaintenanceRequestStatus,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceRequest,
  type MaintenanceStatus,
} from '@/app/actions/maintenance-requests'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'

type Occupancy = { id: string; tenant_id: string; unit_id: string; active_from: string; active_to: string | null }
type Tenant = { id: string; full_name: string }
type Unit = { id: string; building_id: string; unit_number: string }
type Building = { id: string; name: string }

const CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'APPLIANCE', label: 'Appliance' },
  { value: 'STRUCTURAL', label: 'Structural' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'OTHER', label: 'Other' },
]
const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'EMERGENCY', label: 'Emergency' },
]
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
]

export function MaintenanceRequestsManager({
  orgSlug,
  orgName,
  userRole,
  initialRequests,
  initialOccupancies,
  initialTenants,
  initialUnits,
  initialBuildings,
}: {
  orgSlug: string
  orgName: string
  userRole: string
  initialRequests: MaintenanceRequest[]
  initialOccupancies: Occupancy[]
  initialTenants: Tenant[]
  initialUnits: Unit[]
  initialBuildings: Building[]
}) {
  const [isPending, startTransition] = useTransition()
  const [requests, setRequests] = useState(initialRequests)
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [occupancyId, setOccupancyId] = useState('')
  const [category, setCategory] = useState<MaintenanceCategory>('PLUMBING')
  const [priority, setPriority] = useState<MaintenancePriority>('NORMAL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRequest | null>(null)

  const tenantById = useMemo(() => new Map(initialTenants.map((tenant) => [tenant.id, tenant])), [initialTenants])
  const unitById = useMemo(() => new Map(initialUnits.map((unit) => [unit.id, unit])), [initialUnits])
  const buildingById = useMemo(() => new Map(initialBuildings.map((building) => [building.id, building])), [initialBuildings])
  const occupancyById = useMemo(() => new Map(initialOccupancies.map((occupancy) => [occupancy.id, occupancy])), [initialOccupancies])
  const today = new Date().toISOString().slice(0, 10)
  const activeOccupancies = useMemo(
    () => initialOccupancies.filter((occupancy) => occupancy.active_from <= today && (!occupancy.active_to || occupancy.active_to >= today)),
    [initialOccupancies, today]
  )

  const getOccupancyLabel = (id: string) => {
    const occupancy = occupancyById.get(id)
    const tenant = occupancy ? tenantById.get(occupancy.tenant_id) : null
    const unit = occupancy ? unitById.get(occupancy.unit_id) : null
    const building = unit ? buildingById.get(unit.building_id) : null
    return `${tenant?.full_name ?? 'Unknown tenant'} · ${building?.name ?? 'Unknown building'} · Unit ${unit?.unit_number ?? '—'}`
  }

  const occupancyOptions: SelectOption[] = activeOccupancies.map((occupancy) => ({
    value: occupancy.id,
    label: getOccupancyLabel(occupancy.id),
  }))
  const visibleRequests = requests.filter((request) => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'ACTIVE') return !['RESOLVED', 'CLOSED'].includes(request.status)
    return request.status === statusFilter
  })
  const activeCount = requests.filter((request) => !['RESOLVED', 'CLOSED'].includes(request.status)).length
  const emergencyCount = requests.filter((request) => request.priority === 'EMERGENCY' && !['RESOLVED', 'CLOSED'].includes(request.status)).length
  const resolvedCount = requests.filter((request) => request.status === 'RESOLVED' || request.status === 'CLOSED').length

  const refresh = () => {
    startTransition(async () => {
      const result = await listMaintenanceRequests(orgSlug)
      if (result.error) toast.error(result.error)
      else setRequests(result.data ?? [])
    })
  }

  const resetForm = () => {
    setOccupancyId('')
    setCategory('PLUMBING')
    setPriority('NORMAL')
    setTitle('')
    setDescription('')
    setError(null)
  }

  const onCreate = () => {
    const occupancy = occupancyById.get(occupancyId)
    if (!occupancy) return setError('Select an active occupancy.')
    if (!title.trim()) return setError('Request title is required.')
    if (!description.trim()) return setError('Describe the issue so the service team can prepare.')
    setError(null)
    startTransition(async () => {
      const result = await createMaintenanceRequest(orgSlug, {
        tenant_id: occupancy.tenant_id,
        occupancy_id: occupancy.id,
        category,
        priority,
        title,
        description,
      })
      if (result.error) return setError(result.error)
      resetForm()
      refresh()
      toast.success('Maintenance request created.')
    })
  }

  const onStatusChange = (request: MaintenanceRequest, status: MaintenanceStatus) => {
    startTransition(async () => {
      const result = await updateMaintenanceRequestStatus(orgSlug, request.id, status)
      if (result.error || !result.data) {
        toast.error(result.error ?? 'Failed to update request')
        return
      }
      setRequests((current) => current.map((item) => item.id === request.id ? result.data! : item))
      toast.success('Request status updated.')
    })
  }

  const onDelete = () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    startTransition(async () => {
      const result = await deleteMaintenanceRequest(orgSlug, target.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRequests((current) => current.filter((item) => item.id !== target.id))
      toast.success('Maintenance request deleted.')
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <PageHeader eyebrow="Service operations" title="Maintenance requests" description={`Track tenant-reported repairs and service needs for ${orgName}.`} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Active requests" value={activeCount} icon={Clock3} />
        <Summary label="Emergencies" value={emergencyCount} icon={AlertTriangle} tone="danger" />
        <Summary label="Resolved" value={resolvedCount} icon={Wrench} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Request queue</CardTitle>
              <CardDescription className="mt-1">Prioritize urgent issues and keep each request moving.</CardDescription>
            </div>
            <div className="w-full sm:w-44">
              <Select
                options={[{ value: 'ACTIVE', label: 'Active requests' }, { value: 'ALL', label: 'All requests' }, ...STATUS_OPTIONS]}
                value={[{ value: 'ACTIVE', label: 'Active requests' }, { value: 'ALL', label: 'All requests' }, ...STATUS_OPTIONS].find((option) => option.value === statusFilter) ?? null}
                onChange={(option) => setStatusFilter(option?.value ?? 'ACTIVE')}
                isDisabled={isPending}
              />
            </div>
          </CardHeader>
          <CardContent>
            {visibleRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
                <Wrench className="mx-auto h-10 w-10 text-zinc-400" />
                <p className="mt-3 text-sm font-medium">No matching requests</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">New tenant issues will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {visibleRequests.map((request) => (
                  <article key={request.id} className="space-y-4 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge category={request.category} />
                          <PriorityBadge priority={request.priority} />
                        </div>
                        <h3 className="mt-2 font-semibold text-zinc-950 dark:text-white">{request.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{request.description}</p>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{getOccupancyLabel(request.occupancy_id)} · {new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                      {userRole === 'OWNER' ? (
                        <Button variant="tertiary" size="sm" onClick={() => setDeleteTarget(request)} disabled={isPending} aria-label={`Delete ${request.title}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="max-w-48">
                      <Select
                        options={STATUS_OPTIONS}
                        value={STATUS_OPTIONS.find((option) => option.value === request.status) ?? null}
                        onChange={(option) => option && onStatusChange(request, option.value as MaintenanceStatus)}
                        isDisabled={isPending}
                        aria-label={`Status for ${request.title}`}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log a request</CardTitle>
            <CardDescription className="mt-1">Record an issue reported by a tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {occupancyOptions.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">Create an active occupancy before logging a maintenance request.</p>
            ) : (
              <>
                <Select label="Tenant and unit" options={occupancyOptions} value={occupancyOptions.find((option) => option.value === occupancyId) ?? null} onChange={(option) => setOccupancyId(option?.value ?? '')} isDisabled={isPending} />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Category" options={CATEGORY_OPTIONS} value={CATEGORY_OPTIONS.find((option) => option.value === category) ?? null} onChange={(option) => setCategory((option?.value ?? 'PLUMBING') as MaintenanceCategory)} isDisabled={isPending} />
                  <Select label="Priority" options={PRIORITY_OPTIONS} value={PRIORITY_OPTIONS.find((option) => option.value === priority) ?? null} onChange={(option) => setPriority((option?.value ?? 'NORMAL') as MaintenancePriority)} isDisabled={isPending} />
                </div>
                <Input label="Request title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Kitchen tap is leaking" disabled={isPending} />
                <div>
                  <label htmlFor="maintenance-description" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                  <textarea id="maintenance-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={5} disabled={isPending} className="block w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/50" placeholder="Where is the issue, when did it start, and what has the tenant observed?" />
                </div>
                {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
                <Button onClick={onCreate} disabled={isPending} loading={isPending} fullWidth>Create request</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={onDelete} title="Delete maintenance request" description={deleteTarget ? `Delete “${deleteTarget.title}”? This action cannot be undone.` : ''} confirmText="Delete request" cancelText="Cancel" variant="destructive" />
    </div>
  )
}

function Summary({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number; icon: typeof Wrench; tone?: 'default' | 'danger' | 'success' }) {
  const toneClass = tone === 'danger' ? 'text-red-600 dark:text-red-300' : tone === 'success' ? 'text-emerald-600 dark:text-emerald-300' : 'text-zinc-700 dark:text-zinc-200'
  return <Card className="flex items-center gap-4 p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${toneClass}`}><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p></div></Card>
}

function CategoryBadge({ category }: { category: MaintenanceCategory }) {
  const Icon = category === 'PLUMBING' ? Droplets : category === 'ELECTRICAL' ? Bolt : category === 'SECURITY' ? ShieldAlert : Wrench
  return <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"><Icon className="h-3 w-3" />{CATEGORY_OPTIONS.find((option) => option.value === category)?.label}</span>
}

function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  const classes = priority === 'EMERGENCY' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-200' : priority === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes}`}>{PRIORITY_OPTIONS.find((option) => option.value === priority)?.label}</span>
}
