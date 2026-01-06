import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { listOccupancies } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'
import { OccupanciesManager } from '@/components/app/occupancies/occupancies-manager'
import { AppLayout } from '@/components/app/app-layout'

export default async function OccupanciesPage({
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

  const membership = memberships.find((m) => m.organization?.slug === slug)
  if (!membership?.organization) {
    const firstSlug = memberships[0]?.organization?.slug
    if (firstSlug) redirect(`/app/org/${firstSlug}`)
    redirect('/app/onboarding')
  }

  const orgName = membership.organization.name
  const [occupanciesRes, unitsRes, tenantsRes, buildingsRes] = await Promise.all([
    listOccupancies(slug),
    listUnits(slug),
    listTenants(slug),
    listBuildings(slug),
  ])

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="occupancies" userRole={membership.role}>
      <OccupanciesManager
        orgSlug={slug}
        orgName={orgName}
        initialOccupancies={occupanciesRes.data ?? []}
        initialUnits={unitsRes.data ?? []}
        initialTenants={tenantsRes.data ?? []}
        initialBuildings={buildingsRes.data ?? []}
      />
    </AppLayout>
  )
}

