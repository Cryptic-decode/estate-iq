import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserMemberships } from '@/app/actions/organizations'
import { getOrgStats } from '@/app/actions/stats'
import { AppLayout } from '@/components/app/app-layout'
import { Building2, Home, Users, FileText, Wallet, Calendar, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

  if (!user) {
    redirect('/signin')
  }

  // Get user's memberships
  const memberships = await getUserMemberships()

  if (!memberships || memberships.length === 0) {
    redirect('/app/onboarding')
  }

  // Find membership for this org
  const membership = memberships.find((m) => {
    return m.organization?.slug === slug
  })

  if (!membership) {
    // User doesn't have access to this org, redirect to first org
    const firstMembership = memberships[0]
    const firstSlug = firstMembership.organization?.slug
    if (firstSlug) redirect(`/app/org/${firstSlug}`)
    // Fallback to onboarding if org data is missing
    redirect('/app/onboarding')
  }

  const organization = membership.organization
  if (!organization) redirect('/app/onboarding')

  // Fetch organization stats
  const statsResult = await getOrgStats(slug)
  const stats = statsResult.data || {
    buildings: 0,
    units: 0,
    tenants: 0,
    occupancies: 0,
    rentConfigs: 0,
    rentPeriods: 0,
    overduePeriods: 0,
  }

  // Generate contextual guidance based on what's missing
  const getGuidanceMessages = () => {
    const messages: Array<{ type: 'info' | 'warning'; text: string; action?: { label: string; href: string } }> = []

    if (stats.buildings === 0) {
      messages.push({
        type: 'info',
        text: 'Start by creating your first building. Buildings are the foundation of your property portfolio.',
        action: { label: 'Create building', href: `/app/org/${slug}/buildings` },
      })
    } else if (stats.units === 0) {
      messages.push({
        type: 'info',
        text: `You have ${stats.buildings} building${stats.buildings > 1 ? 's' : ''} but no units yet. Create units to track individual rental spaces.`,
        action: { label: 'Create unit', href: `/app/org/${slug}/units` },
      })
    } else if (stats.tenants === 0) {
      messages.push({
        type: 'info',
        text: `You have ${stats.units} unit${stats.units > 1 ? 's' : ''} ready. Now add tenants to assign them to units.`,
        action: { label: 'Add tenant', href: `/app/org/${slug}/tenants` },
      })
    } else if (stats.occupancies === 0) {
      messages.push({
        type: 'info',
        text: `You have ${stats.tenants} tenant${stats.tenants > 1 ? 's' : ''} and ${stats.units} unit${stats.units > 1 ? 's' : ''}. Create occupancies to link tenants to units.`,
        action: { label: 'Create occupancy', href: `/app/org/${slug}/occupancies` },
      })
    } else if (stats.rentConfigs === 0) {
      messages.push({
        type: 'info',
        text: `You have ${stats.occupancies} occupancy${stats.occupancies > 1 ? 'ies' : ''}. Define rent schedules to set up payment terms.`,
        action: { label: 'Create rent schedule', href: `/app/org/${slug}/rent-configs` },
      })
    } else if (stats.rentPeriods === 0) {
      messages.push({
        type: 'info',
        text: `You have ${stats.rentConfigs} rent schedule${stats.rentConfigs > 1 ? 's' : ''}. Generate rent periods to start tracking payments.`,
        action: { label: 'View rent periods', href: `/app/org/${slug}/rent-periods` },
      })
    }

    if (stats.overduePeriods > 0) {
      messages.push({
        type: 'warning',
        text: `You have ${stats.overduePeriods} overdue rent period${stats.overduePeriods > 1 ? 's' : ''} that need attention.`,
        action: { label: 'View overdue', href: `/app/org/${slug}/rent-periods` },
      })
    }

    return messages
  }

  const guidanceMessages = getGuidanceMessages()

  const quickLinks = [
    { href: `buildings`, label: 'Buildings', icon: Building2, description: 'Manage your properties', count: stats.buildings },
    { href: `units`, label: 'Units', icon: Home, description: 'Track individual units', count: stats.units },
    { href: `tenants`, label: 'Tenants', icon: Users, description: 'Manage tenant information', count: stats.tenants },
    { href: `occupancies`, label: 'Occupancies', icon: FileText, description: 'Assign tenants to units', count: stats.occupancies },
    { href: `rent-configs`, label: 'Rent Schedules', icon: Wallet, description: 'Define rent schedules', count: stats.rentConfigs },
    { href: `rent-periods`, label: 'Rent Periods', icon: Calendar, description: 'Track rent payments', count: stats.rentPeriods },
  ]

  return (
    <AppLayout orgSlug={slug} orgName={organization.name} userRole={membership.role}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* Header / Hero */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200">
              Organization dashboard
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {organization.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Quick access to setup, rent schedules, and rent periods.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Signed in as: {membership.role}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Link href={`/app/org/${slug}/rent-periods`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full">
                View rent periods
              </Button>
            </Link>
            <Link href={`/app/org/${slug}/rent-configs`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Configure rent
              </Button>
            </Link>
          </div>
        </div>

        {/* Contextual Guidance */}
        {guidanceMessages.length > 0 && (
          <div className="mb-8 space-y-3">
            {guidanceMessages.map((msg, idx) => (
              <Card
                key={idx}
                className={`p-0 ${
                  msg.type === 'warning'
                    ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20'
                    : ''
                }`}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {msg.type === 'warning' && (
                    <AlertCircle className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
                  )}
                  {msg.type === 'info' && (
                    <div className="h-5 w-5 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        msg.type === 'warning'
                          ? 'text-orange-800 dark:text-orange-200'
                          : 'text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      {msg.text}
                    </p>
                    {msg.action && (
                      <div className="mt-2">
                        <Link href={msg.action.href}>
                          <Button variant="secondary" size="sm">
                            {msg.action.label}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={`/app/org/${slug}/${link.href}`}
                className="group focus:outline-none"
              >
                <Card hover className="h-full p-0 transition-all group-hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                        <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{link.count}</span>
                        <span className="text-xs font-medium text-zinc-500 transition-colors group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                          Open
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <CardTitle className="text-base">{link.label}</CardTitle>
                      <CardDescription className="text-sm">{link.description}</CardDescription>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Helpful next steps */}
        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-0">
            <CardContent className="space-y-3 p-6">
              <div>
                <CardTitle className="text-base">Suggested setup order</CardTitle>
                <CardDescription className="mt-1">
                  Keep it simple: create your inventory first, then attach tenants, then define rent.
                </CardDescription>
              </div>
              <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                <li>
                  <span className="font-medium">1.</span> Add Buildings → create Units
                </li>
                <li>
                  <span className="font-medium">2.</span> Add Tenants → create Occupancies
                </li>
                <li>
                  <span className="font-medium">3.</span> Create Rent Schedules → track Rent Periods
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardContent className="space-y-3 p-6">
              <div>
                <CardTitle className="text-base">About your access</CardTitle>
                <CardDescription className="mt-1">
                  Your role controls what you can view and change within this organization.
                </CardDescription>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                Current role: <span className="font-semibold">{membership.role}</span>
              </div>
              {membership.role === 'OWNER' ? (
                <Link href={`/app/org/${slug}/settings`} className="inline-block">
                  <Button variant="secondary" size="sm">
                    Manage settings
                  </Button>
                </Link>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Need settings access? Ask an owner to update your role.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

