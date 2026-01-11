import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships, getOrganizationBySlug } from '@/app/actions/organizations'
import { BuildingUnpaidView } from '@/components/app/follow-ups/building-unpaid-view'
import { AppLayout } from '@/components/app/app-layout'

export default async function BuildingsUnpaidPage({
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
  const orgRes = await getOrganizationBySlug(slug)
  const currency = orgRes.data?.currency || 'NGN'

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="buildings-unpaid" userRole={membership.role}>
      <BuildingUnpaidView orgSlug={slug} orgName={orgName} currency={currency} />
    </AppLayout>
  )
}

