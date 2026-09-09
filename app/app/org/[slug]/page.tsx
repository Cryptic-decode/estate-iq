import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Check,
  Circle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { getOrgStats } from '@/app/actions/stats'
import { getDueTodayRentPeriods } from '@/app/actions/follow-ups'
import { AppLayout } from '@/components/app/app-layout'
import { DailyBrief } from '@/components/app/dashboard/daily-brief'
import { PageHeader } from '@/components/app/page-header'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const memberships = await getUserMemberships()
  if (!memberships || memberships.length === 0) redirect('/app/onboarding')

  const membership = memberships.find((item) => item.organization?.slug === slug)
  if (!membership) {
    const firstSlug = memberships[0]?.organization?.slug
    if (firstSlug) redirect(`/app/org/${firstSlug}`)
    redirect('/app/onboarding')
  }

  const organization = membership.organization
  if (!organization) redirect('/app/onboarding')

  const [statsResult, dueTodayResult] = await Promise.all([
    getOrgStats(slug),
    getDueTodayRentPeriods(slug),
  ])

  const stats = statsResult.data || {
    buildings: 0,
    units: 0,
    tenants: 0,
    occupancies: 0,
    rentConfigs: 0,
    rentPeriods: 0,
    overduePeriods: 0,
  }
  const dueTodayCount = dueTodayResult.data?.length ?? 0
  const currency = organization.currency || 'NGN'

  const setupSteps = [
    {
      label: 'Add a building',
      description: 'Create the first property in your portfolio.',
      complete: stats.buildings > 0,
      href: 'buildings',
    },
    {
      label: 'Create units',
      description: 'Add the rentable spaces within your buildings.',
      complete: stats.units > 0,
      href: 'units',
    },
    {
      label: 'Add tenants',
      description: 'Create the tenant records you need to manage.',
      complete: stats.tenants > 0,
      href: 'tenants',
    },
    {
      label: 'Assign occupancies',
      description: 'Connect tenants to the units they occupy.',
      complete: stats.occupancies > 0,
      href: 'occupancies',
    },
    {
      label: 'Configure rent',
      description: 'Define amounts, cycles, and due dates.',
      complete: stats.rentConfigs > 0,
      href: 'rent-configs',
    },
    {
      label: 'Generate rent periods',
      description: 'Start tracking due, paid, and overdue rent.',
      complete: stats.rentPeriods > 0,
      href: 'rent-periods',
    },
  ]

  const completedSteps = setupSteps.filter((step) => step.complete).length
  const setupComplete = completedSteps === setupSteps.length
  const nextStep = setupSteps.find((step) => !step.complete)
  const today = new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const portfolioMetrics = [
    { label: 'Buildings', value: stats.buildings, href: 'buildings' },
    { label: 'Units', value: stats.units, href: 'units' },
    { label: 'Tenants', value: stats.tenants, href: 'tenants' },
    { label: 'Active occupancies', value: stats.occupancies, href: 'occupancies' },
  ]

  return (
    <AppLayout orgSlug={slug} orgName={organization.name} userRole={membership.role}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
        <PageHeader
          eyebrow="Dashboard"
          title={organization.name}
          description={
            setupComplete
              ? 'See what needs attention across your rent operations today.'
              : 'Complete your portfolio setup to start tracking rent with confidence.'
          }
          meta={`${today} · ${membership.role.toLowerCase()} access`}
          actions={
            <>
              <ButtonLink href={`/app/org/${slug}/follow-ups`} fullWidth className="sm:w-auto">
                Review follow-ups
              </ButtonLink>
              <ButtonLink
                href={`/app/org/${slug}/payments`}
                variant="secondary"
                fullWidth
                className="sm:w-auto"
              >
                Record payment
              </ButtonLink>
            </>
          }
        />

        <div className="mt-8 space-y-8">
          {!setupComplete && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-secondary/60 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base">Set up your rent workspace</CardTitle>
                    <CardDescription className="mt-1">
                      {completedSteps} of {setupSteps.length} steps complete
                    </CardDescription>
                  </div>
                  {nextStep && (
                    <ButtonLink href={`/app/org/${slug}/${nextStep.href}`} size="sm">
                      Continue setup
                    </ButtonLink>
                  )}
                </div>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Workspace setup progress"
                  aria-valuemin={0}
                  aria-valuemax={setupSteps.length}
                  aria-valuenow={completedSteps}
                >
                  <div
                    className="h-full rounded-full bg-brand-brass transition-[width] motion-reduce:transition-none"
                    style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
                  />
                </div>
              </div>
              <CardContent className="grid gap-2 p-3 md:grid-cols-2">
                {setupSteps.map((step) => (
                  <Link
                    key={step.href}
                    href={`/app/org/${slug}/${step.href}`}
                    className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        step.complete
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">{step.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {step.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {stats.rentPeriods > 0 && (
            <section aria-labelledby="daily-brief-heading">
              <h2 id="daily-brief-heading" className="sr-only">Daily rent brief</h2>
              <DailyBrief
                orgSlug={slug}
                currency={currency}
                initialOverdueCount={stats.overduePeriods}
                initialDueTodayCount={dueTodayCount}
              />
            </section>
          )}

          <section aria-labelledby="portfolio-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 id="portfolio-heading" className="text-base font-semibold text-foreground">
                  Portfolio overview
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">Your current operating footprint</p>
              </div>
            </div>
            <div className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
              {portfolioMetrics.map((metric) => (
                <Link
                  key={metric.label}
                  href={`/app/org/${slug}/${metric.href}`}
                  className="border-border px-3 py-5 transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring odd:border-r [&:nth-child(-n+2)]:border-b sm:border-r sm:border-b-0 sm:last:border-r-0"
                >
                  <p className="font-estate-serif text-3xl tabular-nums tracking-tight text-foreground sm:text-4xl">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground sm:text-sm">{metric.label}</p>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="actions-heading">
            <div className="mb-3">
              <h2 id="actions-heading" className="text-base font-semibold text-foreground">
                Common actions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Move directly into everyday rent operations</p>
            </div>
            <div className="grid border-y border-border lg:grid-cols-2">
              {[
                { label: 'Review rent periods', description: 'See due, paid, and overdue periods.', href: 'rent-periods' },
                { label: 'Record a payment', description: 'Apply a payment to a rent period.', href: 'payments' },
                { label: 'Manage follow-ups', description: 'Work through overdue tenant reminders.', href: 'follow-ups' },
                { label: 'Configure rent', description: 'Update rent amounts, cycles, and due dates.', href: 'rent-configs' },
              ].map((action, index) => (
                <Link
                  key={action.href}
                  href={`/app/org/${slug}/${action.href}`}
                  className="group grid grid-cols-[2.5rem_1fr] gap-3 border-b border-border px-2 py-5 transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring last:border-b-0 lg:[&:nth-child(even)]:border-l lg:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <span className="font-estate-serif text-lg text-brand-brass">0{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
