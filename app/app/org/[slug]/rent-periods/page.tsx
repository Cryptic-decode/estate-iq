import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships, getOrganizationBySlug } from '@/app/actions/organizations'
import { listRentPeriods } from '@/app/actions/rent-periods'
import { listRentConfigs } from '@/app/actions/rent-configs'
import { listOccupancies } from '@/app/actions/occupancies'
import { listUnits } from '@/app/actions/units'
import { listTenants } from '@/app/actions/tenants'
import { listBuildings } from '@/app/actions/buildings'
import { RentPeriodsManager } from '@/components/app/rent-periods/rent-periods-manager'
import { AppLayout } from '@/components/app/app-layout'

export default async function RentPeriodsPage({
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
  const [rentPeriodsRes, rentConfigsRes, occupanciesRes, unitsRes, tenantsRes, buildingsRes, orgRes] =
    await Promise.all([
      listRentPeriods(slug),
      listRentConfigs(slug),
      listOccupancies(slug),
      listUnits(slug),
      listTenants(slug),
      listBuildings(slug),
      getOrganizationBySlug(slug),
    ])

  const currency = orgRes.data?.currency || 'NGN'

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="rent-periods" userRole={membership.role}>
      <RentPeriodsManager
        orgSlug={slug}
        orgName={orgName}
        currency={currency}
        initialRentPeriods={rentPeriodsRes.data ?? []}
        initialRentConfigs={rentConfigsRes.data ?? []}
        initialOccupancies={occupanciesRes.data ?? []}
        initialUnits={unitsRes.data ?? []}
        initialTenants={tenantsRes.data ?? []}
        initialBuildings={buildingsRes.data ?? []}
      />
    </AppLayout>
  )
}

