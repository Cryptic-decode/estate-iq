import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { listMaintenanceRequests } from '@/app/actions/maintenance-requests'
import { listOccupancies } from '@/app/actions/occupancies'
import { listTenants } from '@/app/actions/tenants'
import { listUnits } from '@/app/actions/units'
import { listBuildings } from '@/app/actions/buildings'
import { AppLayout } from '@/components/app/app-layout'
import { MaintenanceRequestsManager } from '@/components/app/maintenance/maintenance-requests-manager'

export default async function MaintenancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const memberships = await getUserMemberships()
  if (!memberships?.length) redirect('/app/onboarding')
  const membership = memberships.find((item) => item.organization?.slug === slug)
  if (!membership?.organization) {
    const firstSlug = memberships[0]?.organization?.slug
    redirect(firstSlug ? `/app/org/${firstSlug}` : '/app/onboarding')
  }

  const [requests, occupancies, tenants, units, buildings] = await Promise.all([
    listMaintenanceRequests(slug),
    listOccupancies(slug),
    listTenants(slug),
    listUnits(slug),
    listBuildings(slug),
  ])

  return (
    <AppLayout orgSlug={slug} orgName={membership.organization.name} currentPath="maintenance" userRole={membership.role}>
      <MaintenanceRequestsManager
        orgSlug={slug}
        orgName={membership.organization.name}
        userRole={membership.role}
        initialRequests={requests.data ?? []}
        initialOccupancies={occupancies.data ?? []}
        initialTenants={tenants.data ?? []}
        initialUnits={units.data ?? []}
        initialBuildings={buildings.data ?? []}
      />
    </AppLayout>
  )
}
