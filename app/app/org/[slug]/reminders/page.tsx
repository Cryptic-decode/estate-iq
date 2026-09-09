import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserMemberships } from '@/app/actions/organizations'
import { listReminderSends } from '@/app/actions/follow-ups'
import { AppLayout } from '@/components/app/app-layout'
import { ReminderHistory } from '@/components/app/reminders/reminder-history'

export default async function ReminderHistoryPage({
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

  const membership = memberships.find((item) => item.organization?.slug === slug)
  if (!membership?.organization) {
    const firstSlug = memberships[0]?.organization?.slug
    if (firstSlug) redirect(`/app/org/${firstSlug}`)
    redirect('/app/onboarding')
  }

  const reminders = await listReminderSends(slug, { limit: 100 })

  return (
    <AppLayout
      orgSlug={slug}
      orgName={membership.organization.name}
      currentPath="reminders"
      userRole={membership.role}
    >
      <ReminderHistory
        orgSlug={slug}
        orgName={membership.organization.name}
        initialReminders={reminders.data ?? []}
        initialError={reminders.error}
      />
    </AppLayout>
  )
}
