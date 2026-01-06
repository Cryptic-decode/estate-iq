import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserMemberships } from '@/app/actions/organizations'
import { AppLayout } from '@/components/app/app-layout'
import { Building2, Home, Users, FileText, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

  const quickLinks = [
    { href: `buildings`, label: 'Buildings', icon: Building2, description: 'Manage your properties' },
    { href: `units`, label: 'Units', icon: Home, description: 'Track individual units' },
    { href: `tenants`, label: 'Tenants', icon: Users, description: 'Manage tenant information' },
    { href: `occupancies`, label: 'Occupancies', icon: FileText, description: 'Assign tenants to units' },
    { href: `rent-configs`, label: 'Rent Configs', icon: DollarSign, description: 'Define rent schedules' },
    { href: `rent-periods`, label: 'Rent Periods', icon: Calendar, description: 'Track rent payments' },
  ]

  return (
    <AppLayout orgSlug={slug} orgName={organization.name} userRole={membership.role}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Welcome to {organization.name}
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Your rent intelligence dashboard
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Role: {membership.role}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={`/app/org/${slug}/${link.href}`}
                className="group"
              >
                <Card hover className="h-full transition-all group-hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                      <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                    </div>
                    <CardTitle>{link.label}</CardTitle>
                    <CardDescription>{link.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}

