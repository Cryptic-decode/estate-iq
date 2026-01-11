'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Shield, RefreshCw, Filter, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, type SelectOption } from '@/components/ui/select'
import { listAuditLogs, type AuditActionType, type AuditEntityType, type AuditLogMetadata } from '@/app/actions/audit-logs'

type AuditLogRow = {
  id: string
  user_id: string | null
  action_type: AuditActionType
  entity_type: AuditEntityType
  entity_id: string | null
  description: string
  metadata: AuditLogMetadata | null
  created_at: string
}

const actionTypeOptions: SelectOption[] = [
  { value: '', label: 'All actions' },
  { value: 'PAYMENT_CREATED', label: 'Payment created' },
  { value: 'PAYMENT_UPDATED', label: 'Payment updated' },
  { value: 'PAYMENT_DELETED', label: 'Payment deleted' },
  { value: 'RENT_PERIOD_STATUS_CHANGED', label: 'Rent period status changed' },
  { value: 'ORGANIZATION_CURRENCY_UPDATED', label: 'Currency updated' },
  { value: 'MEMBERSHIP_ROLE_CHANGED', label: 'Membership role changed' },
  { value: 'MEMBERSHIP_CREATED', label: 'Membership created' },
  { value: 'MEMBERSHIP_DELETED', label: 'Membership deleted' },
]

const entityTypeOptions: SelectOption[] = [
  { value: '', label: 'All entities' },
  { value: 'payment', label: 'Payment' },
  { value: 'rent_period', label: 'Rent period' },
  { value: 'organization', label: 'Organization' },
  { value: 'membership', label: 'Membership' },
]

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function shortId(id: string | null) {
  if (!id) return 'System'
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

export function AuditTrailView({
  orgSlug,
  orgName,
  initialLogs,
  initialError,
}: {
  orgSlug: string
  orgName: string
  initialLogs: AuditLogRow[]
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<AuditLogRow[]>(initialLogs)
  const [error, setError] = useState<string | null>(initialError)

  const [actionType, setActionType] = useState<SelectOption | null>(actionTypeOptions[0] ?? null)
  const [entityType, setEntityType] = useState<SelectOption | null>(entityTypeOptions[0] ?? null)
  const [entityId, setEntityId] = useState('')

  useEffect(() => {
    if (initialError) toast.error(initialError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canClear = useMemo(() => {
    return Boolean((actionType?.value ?? '') || (entityType?.value ?? '') || entityId.trim())
  }, [actionType, entityType, entityId])

  const refresh = (opts?: { reset?: boolean }) => {
    setIsLoading(true)
    startTransition(async () => {
      const shouldReset = opts?.reset === true
      const nextAction = shouldReset ? '' : String(actionType?.value ?? '')
      const nextEntity = shouldReset ? '' : String(entityType?.value ?? '')
      const nextEntityId = shouldReset ? '' : entityId.trim()

      const res = await listAuditLogs(orgSlug, {
        actionType: (nextAction || undefined) as AuditActionType | undefined,
        entityType: (nextEntity || undefined) as AuditEntityType | undefined,
        entityId: nextEntityId || undefined,
        limit: 100,
      })

      setIsLoading(false)

      if (res.error) {
        setError(res.error)
        toast.error(res.error)
        return
      }

      setError(null)
      setLogs((res.data as any) ?? [])
      toast.success('Audit trail refreshed')

      if (shouldReset) {
        setActionType(actionTypeOptions[0] ?? null)
        setEntityType(entityTypeOptions[0] ?? null)
        setEntityId('')
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Audit trail</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            A history of sensitive changes for <span className="font-medium">{orgName}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href={`/app/org/${orgSlug}/reports`} className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full">
              Back to reports
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => refresh()}
            disabled={isPending || isLoading}
            loading={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 p-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
          <CardDescription className="mt-1">Narrow down the audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Action"
            options={actionTypeOptions}
            value={actionType}
            onChange={(opt) => setActionType(opt)}
            isDisabled={isPending}
            placeholder="All actions"
          />

          <Select
            label="Entity"
            options={entityTypeOptions}
            value={entityType}
            onChange={(opt) => setEntityType(opt)}
            isDisabled={isPending}
            placeholder="All entities"
          />

          <Input
            label="Entity ID (optional)"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            disabled={isPending}
            placeholder="Paste an ID to filter"
          />

          <div className="sm:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="secondary" size="sm" onClick={() => refresh()} disabled={isPending || isLoading} loading={isLoading}>
              Apply filters
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => refresh({ reset: true })}
              disabled={!canClear || isPending || isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
          <CardDescription className="mt-1">Most recent events appear first (up to 100).</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No events found</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Try adjusting filters, or perform an action (like recording a payment) and refresh.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="grid grid-cols-12 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-300">
                <div className="col-span-3">Time</div>
                <div className="col-span-2">Action</div>
                <div className="col-span-2">Entity</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2 text-right">Actor</div>
              </div>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {logs.map((l) => (
                  <div key={l.id} className="px-4 py-3">
                    <div className="grid grid-cols-12 gap-3 text-sm">
                      <div className="col-span-12 sm:col-span-3 text-zinc-700 dark:text-zinc-200">
                        {formatDateTime(l.created_at)}
                      </div>
                      <div className="col-span-6 sm:col-span-2 font-medium text-zinc-900 dark:text-zinc-50">
                        {l.action_type.replaceAll('_', ' ')}
                      </div>
                      <div className="col-span-6 sm:col-span-2 text-zinc-700 dark:text-zinc-200">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">{l.entity_type}</div>
                        {l.entity_id ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{shortId(l.entity_id)}</div>
                        ) : null}
                      </div>
                      <div className="col-span-12 sm:col-span-3 text-zinc-700 dark:text-zinc-200">
                        {l.description}
                      </div>
                      <div className="col-span-12 sm:col-span-2 text-right text-zinc-700 dark:text-zinc-200">
                        {shortId(l.user_id)}
                      </div>
                    </div>

                    {l.metadata ? (
                      <details className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                        <summary className="cursor-pointer select-none font-medium text-zinc-900 dark:text-zinc-50">
                          View details
                        </summary>
                        <pre className="mt-2 overflow-auto whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                          {JSON.stringify(l.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


