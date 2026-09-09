'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  listReminderSends,
  retryReminderEmail,
  type ReminderSend,
  type ReminderSendStatus,
} from '@/app/actions/follow-ups'
import { PageHeader } from '@/components/app/page-header'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select, type SelectOption } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const statusOptions: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Accepted by provider' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'bounced', label: 'Bounced' },
]

const statusLabels: Record<ReminderSendStatus, string> = {
  pending: 'Pending',
  sent: 'Accepted',
  failed: 'Failed',
  delivered: 'Delivered',
  bounced: 'Bounced',
}

const statusClasses: Record<ReminderSendStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReminderHistory({
  orgSlug,
  orgName,
  initialReminders,
  initialError,
}: {
  orgSlug: string
  orgName: string
  initialReminders: ReminderSend[]
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [reminders, setReminders] = useState(initialReminders)
  const [status, setStatus] = useState<SelectOption | null>(statusOptions[0] ?? null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  useEffect(() => {
    if (initialError) toast.error(initialError)
  }, [initialError])

  const summary = useMemo(
    () => ({
      total: reminders.length,
      accepted: reminders.filter((item) => item.status === 'sent').length,
      failed: reminders.filter((item) => item.status === 'failed' || item.status === 'bounced').length,
    }),
    [reminders]
  )

  const refresh = (nextStatus = status?.value ?? '', announce = true) => {
    setIsLoading(true)
    startTransition(async () => {
      const result = await listReminderSends(orgSlug, {
        status: (nextStatus || undefined) as ReminderSendStatus | undefined,
        limit: 100,
      })
      setIsLoading(false)

      if (result.error) {
        toast.error(result.error)
        return
      }

      setReminders(result.data ?? [])
      if (announce) toast.success('Reminder history refreshed.')
    })
  }

  const retry = (reminder: ReminderSend) => {
    setRetryingId(reminder.id)
    startTransition(async () => {
      const result = await retryReminderEmail(orgSlug, reminder.id)
      setRetryingId(null)

      if (!result.success) {
        toast.error('Unable to retry reminder', {
          description: result.error ?? 'Please try again.',
        })
        return
      }

      toast.success('Reminder retry accepted.')
      refresh(status?.value ?? '', false)
    })
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <PageHeader
        eyebrow="Rent operations"
        title="Reminder history"
        description={`Review tracked reminder attempts for ${orgName}.`}
        meta={`${summary.total} attempts · ${summary.accepted} accepted · ${summary.failed} failed`}
        actions={
          <>
            <ButtonLink href={`/app/org/${orgSlug}/follow-ups`} variant="secondary">
              Follow-up queue
            </ButtonLink>
            <Button
              variant="secondary"
              onClick={() => refresh()}
              disabled={isPending || isLoading}
              loading={isLoading}
            >
              Refresh
            </Button>
          </>
        }
      />

      <Card className="mt-8">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Email attempts</CardTitle>
            <CardDescription className="mt-1">
              “Accepted” means the email provider accepted the request. Delivery events require webhook tracking.
            </CardDescription>
          </div>
          <div className="w-full sm:w-56">
            <Select
              label="Status"
              options={statusOptions}
              value={status}
              onChange={(option) => {
                const next = option ?? statusOptions[0] ?? null
                setStatus(next)
                refresh(next?.value ?? '', false)
              }}
              isDisabled={isPending || isLoading}
              isSearchable={false}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24" />)}
            </div>
          ) : reminders.length === 0 ? (
            <EmptyState
              title="No reminder attempts found"
              description="Send a reminder from the follow-up queue or rent periods page to start the history."
              action={
                <ButtonLink href={`/app/org/${orgSlug}/follow-ups`} variant="secondary" size="sm">
                  Open follow-up queue
                </ButtonLink>
              }
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {reminders.map((reminder) => {
                const canRetry = reminder.status === 'failed' || reminder.status === 'bounced'
                return (
                  <article key={reminder.id} className="grid gap-4 bg-card px-4 py-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-card-foreground">{reminder.to_address}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[reminder.status]}`}>
                          {statusLabels[reminder.status]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {reminder.subject || 'Rent reminder'}
                      </p>
                      {reminder.error_message ? (
                        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{reminder.error_message}</p>
                      ) : null}
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Tone</dt>
                        <dd className="capitalize text-foreground">{reminder.tone}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Attempted</dt>
                        <dd className="text-foreground">{formatDateTime(reminder.created_at)}</dd>
                      </div>
                    </dl>

                    <div className="lg:justify-self-end">
                      {canRetry ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => retry(reminder)}
                          disabled={isPending || retryingId !== null}
                          loading={retryingId === reminder.id}
                        >
                          Retry email
                        </Button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
