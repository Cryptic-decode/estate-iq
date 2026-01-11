import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { AppLayout } from '@/components/app/app-layout'
import { AuditTrailView } from '@/components/app/reports/audit-trail'
import { listAuditLogs } from '@/app/actions/audit-logs'

export default async function AuditTrailPage({
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
  const logsRes = await listAuditLogs(slug, { limit: 50 })

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="reports/audit-trail" userRole={membership.role}>
      <AuditTrailView
        orgSlug={slug}
        orgName={orgName}
        initialLogs={(logsRes.data as any) ?? []}
        initialError={logsRes.error}
      />
    </AppLayout>
  )
}


