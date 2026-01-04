import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserMemberships } from '@/app/actions/organizations'
import { signOut } from '@/app/actions/auth'

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  // Get user's memberships
  const memberships = await getUserMemberships()

  if (!memberships || memberships.length === 0) {
    redirect('/app/onboarding')
  }

  // Find membership for this org
  const membership = memberships.find((m) => {
    return m.organization?.slug === slug
  })

  if (!membership) {
    // User doesn't have access to this org, redirect to first org
    const firstMembership = memberships[0]
    const firstSlug = firstMembership.organization?.slug
    if (firstSlug) redirect(`/app/org/${firstSlug}`)
    // Fallback to onboarding if org data is missing
    redirect('/app/onboarding')
  }

  const organization = membership.organization
  if (!organization) redirect('/app/onboarding')

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">EstateIQ</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{organization.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/app/org/${organization.slug}/buildings`}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Buildings
            </Link>
            <Link
              href={`/app/org/${organization.slug}/units`}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Units
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome to {organization.name}
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-300">
            Your rent intelligence dashboard (coming soon)
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Role: {membership.role}
          </p>
        </div>
      </main>
    </div>
  )
}

