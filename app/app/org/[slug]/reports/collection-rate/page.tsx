import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships, getOrganizationBySlug } from '@/app/actions/organizations'
import { AppLayout } from '@/components/app/app-layout'
import { CollectionRateReportView } from '@/components/app/reports/collection-rate-report'
import { getCollectionRate } from '@/app/actions/reports'

export default async function CollectionRatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
  const { slug } = await params
  const { startDate, endDate } = await searchParams
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

  // Default to last 30 days if no dates provided
  const defaultStartDate = (() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })()

  const defaultEndDate = new Date().toISOString().split('T')[0]

  const reportStartDate = startDate || defaultStartDate
  const reportEndDate = endDate || defaultEndDate

  const reportRes = await getCollectionRate(slug, reportStartDate, reportEndDate)

  return (
    <AppLayout orgSlug={slug} orgName={orgName} currentPath="reports/collection-rate" userRole={membership.role}>
      <CollectionRateReportView
        orgSlug={slug}
        orgName={orgName}
        currency={currency}
        initialReport={reportRes.data}
        initialError={reportRes.error}
      />
    </AppLayout>
  )
}

