import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { listBuildings } from '@/app/actions/buildings'
import { BuildingsManager } from '@/components/app/buildings/buildings-manager'
import { AppLayout } from '@/components/app/app-layout'

export default async function BuildingsPage({
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
  const res = await listBuildings(slug)

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="buildings" userRole={membership.role}>
      <BuildingsManager orgSlug={slug} orgName={orgName} initialBuildings={res.data ?? []} />
    </AppLayout>
  )
}


