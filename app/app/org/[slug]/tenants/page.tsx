import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { listTenants } from '@/app/actions/tenants'
import { TenantsManager } from '@/components/app/tenants/tenants-manager'
import { AppLayout } from '@/components/app/app-layout'

export default async function TenantsPage({
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
  const res = await listTenants(slug)

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="tenants" userRole={membership.role}>
      <TenantsManager orgSlug={slug} orgName={orgName} initialTenants={res.data ?? []} />
    </AppLayout>
  )
}

