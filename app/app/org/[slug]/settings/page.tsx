import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships, getOrganizationBySlug } from '@/app/actions/organizations'
import { SettingsManager } from '@/components/app/settings/settings-manager'
import { AppLayout } from '@/components/app/app-layout'

export default async function SettingsPage({
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

  // Only OWNER can access settings
  if (membership.role !== 'OWNER') {
    redirect(`/app/org/${slug}`)
  }

  const orgName = membership.organization.name
  const orgRes = await getOrganizationBySlug(slug)

  if (orgRes.error || !orgRes.data) {
    redirect(`/app/org/${slug}`)
  }

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="settings" userRole={membership.role}>
      <SettingsManager
        orgSlug={slug}
        orgName={orgName}
        initialCurrency={orgRes.data.currency || 'NGN'}
      />
    </AppLayout>
  )
}

