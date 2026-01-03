import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from '@/app/actions/organizations'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // If user already has memberships, redirect to their org
  const memberships = await getUserMemberships()

  if (memberships && memberships.length > 0) {
    const firstMembership = memberships[0]
    const slug = firstMembership.organization?.slug
    if (slug) redirect(`/app/org/${slug}`)
    // If org data is missing, allow onboarding to proceed
  }

  return <>{children}</>
}

