'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug'

type OrganizationRef = {
  id: string
  name: string
  slug: string
}

export type MembershipWithOrganization = {
  id: string
  role: string
  organization: OrganizationRef | null
}

/**
 * Get user's organization memberships
 */
export async function getUserMemberships(): Promise<MembershipWithOrganization[] | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      organization:organizations!memberships_organization_id_fkey (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching memberships:', error)
    return null
  }

  // Supabase nested selects can be typed as an array depending on relationship inference.
  // Normalize to OrganizationRef | null so the rest of the app has a stable shape.
  const normalized = (memberships ?? []).map((m) => {
    const rawOrg = (m as any).organization
    const organization = Array.isArray(rawOrg) ? rawOrg[0] ?? null : rawOrg ?? null
    return {
      id: (m as any).id as string,
      role: (m as any).role as string,
      organization: organization as OrganizationRef | null,
    }
  })

  return normalized
}

/**
 * Create a new organization and OWNER membership for the current user
 */
export async function createOrganization(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const companyName = formData.get('companyName') as string

  if (!companyName || companyName.trim().length === 0) {
    return {
      error: 'Company name is required',
    }
  }

  // Generate slug from company name
  const baseSlug = generateSlug(companyName)

  if (baseSlug.length === 0) {
    return {
      error: 'Please enter a valid company name',
    }
  }

  // Check for existing slugs to ensure uniqueness
  const { data: existingOrgs } = await supabase
    .from('organizations')
    .select('slug')
    .ilike('slug', `${baseSlug}%`)

  const existingSlugs = existingOrgs?.map((org) => org.slug) || []
  const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs)

  // Use SECURITY DEFINER function to create organization and membership atomically
  // This bypasses RLS policies and ensures onboarding works reliably
  const { data: orgId, error: rpcError } = await supabase.rpc('create_organization_for_user', {
    org_name: companyName.trim(),
    org_slug: uniqueSlug,
    user_uuid: user.id,
  })

  if (rpcError || !orgId) {
    console.error('Error creating organization via RPC:', rpcError)
    return {
      error: rpcError?.message || 'Failed to create organization. Please try again.',
    }
  }

  // Fetch the created organization to get the slug for redirect
  const { data: organization, error: fetchError } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', orgId)
    .single()

  if (fetchError || !organization) {
    console.error('Error fetching created organization:', fetchError)
    return {
      error: 'Organization created but failed to fetch details. Please refresh the page.',
    }
  }

  // Redirect to org dashboard
  redirect(`/app/org/${organization.slug}`)
}

