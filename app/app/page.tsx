import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from '@/app/actions/organizations'

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Check for organization membership
  const memberships = await getUserMemberships()

  // If no org, redirect to onboarding
  if (!memberships || memberships.length === 0) {
    redirect('/app/onboarding')
  }

  // If org exists, redirect to first org's dashboard
  const firstMembership = memberships[0]
  const slug = firstMembership.organization?.slug
  if (slug) redirect(`/app/org/${slug}`)
  // Fallback to onboarding if org data is missing
  redirect('/app/onboarding')
}

