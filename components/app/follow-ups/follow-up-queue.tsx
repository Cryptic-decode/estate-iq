'use client'

import { useMemo, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Clock, Receipt, Building2, Home, User, Calendar, Wallet, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, type SelectOption } from '@/components/ui/select'
import { PageHeader } from '@/components/app/page-header'
import {
  getOverdueRentPeriods,
  getDueTodayRentPeriods,
  sendBatchReminderEmail,
  sendReminderEmail,
  type OverdueRentPeriod,
  type DueTodayRentPeriod,
  type ReminderTone,
} from '@/app/actions/follow-ups'
import { formatCurrency } from '@/lib/utils/currency'

const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
}

const toneOptions: SelectOption[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'urgent', label: 'Urgent' },
]

export function FollowUpQueue({
  orgSlug,
  orgName,
  currency,
  initialOverduePeriods,
  initialDueTodayPeriods,
  initialError,
}: {
  orgSlug: string
  orgName: string
  currency: string
  initialOverduePeriods: OverdueRentPeriod[]
  initialDueTodayPeriods: DueTodayRentPeriod[]
  initialError: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [overduePeriods, setOverduePeriods] = useState<OverdueRentPeriod[]>(initialOverduePeriods)
  const [dueTodayPeriods, setDueTodayPeriods] = useState<DueTodayRentPeriod[]>(initialDueTodayPeriods)
  const [activeTab, setActiveTab] = useState<'overdue' | 'due-today'>('overdue')
  const [reminderTone, setReminderTone] = useState<ReminderTone>('friendly')
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<Set<string>>(new Set())
  const [sendTarget, setSendTarget] = useState<{
    rentPeriodId: string
    tenantName: string
    tenantEmail: string
  } | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const refresh = () => {
    setIsLoading(true)
    startTransition(async () => {
      const [overdueRes, dueTodayRes] = await Promise.all([
        getOverdueRentPeriods(orgSlug),
        getDueTodayRentPeriods(orgSlug),
      ])

      if (overdueRes.error) {
        toast.error(overdueRes.error)
      } else if (overdueRes.data) {
        setOverduePeriods(overdueRes.data)
      }

      if (dueTodayRes.error) {
        toast.error(dueTodayRes.error)
      } else if (dueTodayRes.data) {
        setDueTodayPeriods(dueTodayRes.data)
      }

      setIsLoading(false)
      setSelectedPeriodIds(new Set())
    })
  }

  const displayPeriods = activeTab === 'overdue' ? overduePeriods : dueTodayPeriods
  const hasOverdue = overduePeriods.length > 0
  const hasDueToday = dueTodayPeriods.length > 0
  const eligiblePeriodIds = displayPeriods
    .filter((period) => Boolean(period.rent_config.occupancy.tenant.email))
    .map((period) => period.id)
  const allEligibleSelected =
    eligiblePeriodIds.length > 0 &&
    eligiblePeriodIds.slice(0, 25).every((id) => selectedPeriodIds.has(id))
  const toneLabel = toneOptions.find((o) => o.value === reminderTone)?.label || 'Friendly'
  const overdueAmount = useMemo(
    () => overduePeriods.reduce((total, period) => total + period.rent_config.amount, 0),
    [overduePeriods]
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }}>
        <PageHeader
          eyebrow="Rent operations"
          title="Follow-up queue"
          description={`Prioritize overdue rent, record payments, and contact tenants for ${orgName}.`}
          meta={`${overduePeriods.length} overdue · ${dueTodayPeriods.length} due today · ${formatCurrency(overdueAmount, currency)} overdue`}
          actions={
            <>
              <ButtonLink href={`/app/org/${orgSlug}/reminders`} variant="secondary">
                Reminder history
              </ButtonLink>
              <Button variant="secondary" onClick={refresh} disabled={isPending || isLoading} loading={isLoading}>
                Refresh
              </Button>
            </>
          }
        />

        {initialError && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          >
            {initialError}. Refresh to try again.
          </div>
        )}

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Rent periods requiring attention</CardTitle>
              <CardDescription className="mt-1">
                Review overdue and due today periods. Record payments or take follow-up actions.
              </CardDescription>
            </div>
            <div className="w-full sm:w-48">
                <Select
                  label="Reminder tone"
                  options={toneOptions}
                  value={toneOptions.find((o) => o.value === reminderTone) ?? toneOptions[0]}
                  onChange={(opt) => setReminderTone(((opt?.value || 'friendly') as ReminderTone) ?? 'friendly')}
                  isDisabled={isPending || isLoading}
                  isSearchable={false}
                />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800" role="tablist" aria-label="Follow-up status">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'overdue'}
                onClick={() => {
                  setActiveTab('overdue')
                  setSelectedPeriodIds(new Set())
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'overdue'
                    ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                <AlertCircle className="h-4 w-4" />
                Overdue
                {hasOverdue && (
                  <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {overduePeriods.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'due-today'}
                onClick={() => {
                  setActiveTab('due-today')
                  setSelectedPeriodIds(new Set())
                }}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'due-today'
                    ? 'border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                    : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
                }`}
              >
                <Clock className="h-4 w-4" />
                Due today
                {hasDueToday && (
                  <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {dueTodayPeriods.length}
                  </span>
                )}
              </button>
            </div>

            {eligiblePeriodIds.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={allEligibleSelected}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedPeriodIds(new Set(eligiblePeriodIds.slice(0, 25)))
                        if (eligiblePeriodIds.length > 25) {
                          toast.warning('The first 25 eligible reminders were selected.')
                        }
                      } else {
                        setSelectedPeriodIds(new Set())
                      }
                    }}
                    className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  Select eligible reminders
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedPeriodIds.size} selected</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPeriodIds(new Set())}
                    disabled={selectedPeriodIds.size === 0 || isPending}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBatchConfirmOpen(true)}
                    disabled={selectedPeriodIds.size === 0 || isPending}
                  >
                    Send selected
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3 pt-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24 rounded-md" />
                      <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayPeriods.length === 0 ? (
              <EmptyState
                title={activeTab === 'overdue' ? 'No overdue periods' : 'No periods due today'}
                description={
                  activeTab === 'overdue'
                    ? 'All current rent periods are up to date.'
                    : 'No rent periods are due today. Check back tomorrow or review all periods.'
                }
                action={
                  <ButtonLink href={`/app/org/${orgSlug}/rent-periods`} variant="secondary" size="sm">
                    View all periods
                  </ButtonLink>
                }
              />
            ) : (
              <div role="tabpanel" className="space-y-3 pt-4">
                <AnimatePresence mode="wait">
                  {displayPeriods.map((period) => {
                    const isOverdue = period.status === 'OVERDUE'
                    const building = period.rent_config.occupancy.unit.building
                    const unit = period.rent_config.occupancy.unit
                    const tenant = period.rent_config.occupancy.tenant

                    return (
                      <motion.div
                        key={period.id}
                        initial={fadeUp.initial}
                        animate={fadeUp.animate}
                        exit={fadeUp.exit}
                        className={`rounded-lg border p-4 transition-all ${
                          isOverdue
                            ? (() => {
                                const isCritical = period.days_overdue > 30
                                const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                                const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                                if (isCritical) return 'border-l-4 border-red-600 bg-red-50 dark:border-red-500 dark:bg-red-950/20'
                                if (isHigh) return 'border-l-4 border-red-500 bg-red-50/80 dark:border-red-600 dark:bg-red-950/15'
                                if (isMedium) return 'border-l-4 border-red-400 bg-red-50/60 dark:border-red-700 dark:bg-red-950/10'
                                return 'border-l-4 border-red-300 bg-red-50/40 dark:border-red-800 dark:bg-red-950/5'
                              })()
                            : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-start gap-3">
                              <label className="flex h-6 w-6 shrink-0 items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={selectedPeriodIds.has(period.id)}
                                  disabled={!tenant.email || isPending}
                                  onChange={(event) => {
                                    setSelectedPeriodIds((current) => {
                                      const next = new Set(current)
                                      if (event.target.checked) {
                                        if (next.size >= 25) {
                                          toast.warning('You can send up to 25 reminders at a time.')
                                          return current
                                        }
                                        next.add(period.id)
                                      } else {
                                        next.delete(period.id)
                                      }
                                      return next
                                    })
                                  }}
                                  aria-label={`Select reminder for ${tenant.full_name}`}
                                  className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </label>
                              {isOverdue ? (
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                              ) : (
                                <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3
                                    className={`text-sm font-semibold ${
                                      isOverdue
                                        ? 'text-red-900 dark:text-red-100'
                                        : 'text-amber-900 dark:text-amber-100'
                                    }`}
                                  >
                                    {tenant.full_name}
                                  </h3>
                                  {isOverdue && (() => {
                                    const isCritical = period.days_overdue > 30
                                    const isHigh = period.days_overdue > 14 && period.days_overdue <= 30
                                    const isMedium = period.days_overdue > 7 && period.days_overdue <= 14
                                    const priorityLabel = isCritical ? 'Critical' : isHigh ? 'High' : isMedium ? 'Medium' : 'Low'
                                    const badgeClass = isCritical
                                      ? 'bg-red-600 text-white dark:bg-red-500 dark:text-white'
                                      : isHigh
                                        ? 'bg-red-500 text-white dark:bg-red-600 dark:text-white'
                                        : isMedium
                                          ? 'bg-red-400 text-white dark:bg-red-700 dark:text-white'
                                          : 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                    return (
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                        {priorityLabel} • {period.days_overdue} day{period.days_overdue !== 1 ? 's' : ''} overdue
                                      </span>
                                    )
                                  })()}
                                </div>
                                <p
                                  className={`mt-1 text-xs ${
                                    isOverdue ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {formatCurrency(period.rent_config.amount, currency)} • {formatDate(period.due_date)}
                                </p>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="ml-8 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">{building.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Home className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">Unit {unit.unit_number}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">{tenant.full_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400">
                                  {formatDate(period.period_start)} - {formatDate(period.period_end)}
                                </span>
                              </div>
                              {tenant.email && (
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-400">Email:</span>
                                  <span className="break-all text-zinc-600 dark:text-zinc-400">{tenant.email}</span>
                                </div>
                              )}
                              {tenant.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-400">Phone:</span>
                                  <span className="text-zinc-600 dark:text-zinc-400">{tenant.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-1 xl:grid-cols-3">
                            <ButtonLink href={`/app/org/${orgSlug}/payments?rentPeriodId=${period.id}`} size="sm" fullWidth>
                              <Receipt className="h-4 w-4" />
                              Record payment
                            </ButtonLink>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={isPending || !tenant.email}
                              onClick={() => {
                                if (!tenant.email) return
                                setSendTarget({
                                  rentPeriodId: period.id,
                                  tenantName: tenant.full_name,
                                  tenantEmail: tenant.email,
                                })
                                setSendConfirmOpen(true)
                              }}
                            >
                              <Mail className="mr-1.5 h-4 w-4" />
                              Send reminder
                            </Button>
                            <ButtonLink href={`/app/org/${orgSlug}/rent-periods`} variant="secondary" size="sm" fullWidth>
                              <Wallet className="h-4 w-4" />
                              View details
                            </ButtonLink>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={sendConfirmOpen}
        onClose={() => {
          if (isPending) return
          setSendConfirmOpen(false)
          setSendTarget(null)
        }}
        onConfirm={() => {
          if (!sendTarget) return
          startTransition(async () => {
            const res = await sendReminderEmail(orgSlug, sendTarget.rentPeriodId, reminderTone)
            if (res.success) {
              toast.success(`Reminder sent to ${sendTarget.tenantEmail}`)
            } else {
              toast.error(res.error || 'Failed to send reminder')
            }
            setSendConfirmOpen(false)
            setSendTarget(null)
          })
        }}
        title="Send reminder email?"
        description={
          sendTarget
            ? `This will send a ${toneLabel.toLowerCase()} reminder email to ${sendTarget.tenantName} (${sendTarget.tenantEmail}). Continue?`
            : 'This will send a reminder email. Continue?'
        }
        confirmText="Send email"
        cancelText="Cancel"
        loading={isPending}
      />

      <ConfirmDialog
        open={batchConfirmOpen}
        onClose={() => {
          if (!isPending) setBatchConfirmOpen(false)
        }}
        onConfirm={() => {
          const selectedIds = Array.from(selectedPeriodIds)
          if (selectedIds.length === 0) return

          startTransition(async () => {
            const result = await sendBatchReminderEmail(orgSlug, selectedIds, reminderTone)
            if (result.sentCount > 0 && result.failedCount === 0) {
              toast.success(`${result.sentCount} reminder email${result.sentCount === 1 ? '' : 's'} accepted.`)
            } else if (result.sentCount > 0) {
              toast.warning(`${result.sentCount} accepted, ${result.failedCount} failed.`)
            } else {
              toast.error(result.error || 'No reminder emails were sent.')
            }
            setSelectedPeriodIds(new Set())
            setBatchConfirmOpen(false)
          })
        }}
        title="Send selected reminder emails?"
        description={`This will send one ${toneLabel.toLowerCase()} email for each of the ${selectedPeriodIds.size} selected rent periods. Continue?`}
        confirmText="Send emails"
        cancelText="Cancel"
        loading={isPending}
      />
    </div>
  )
}
