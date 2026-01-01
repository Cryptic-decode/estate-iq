'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug'

/**
 * Get user's organization memberships
 */
export async function getUserMemberships() {
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
      organization:organizations (
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

  return memberships
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

  // Create organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: companyName.trim(),
      slug: uniqueSlug,
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    return {
      error: 'Failed to create organization. Please try again.',
    }
  }

  // Create OWNER membership
  const { error: membershipError } = await supabase.from('memberships').insert({
    user_id: user.id,
    organization_id: organization.id,
    role: 'OWNER',
  })

  if (membershipError) {
    console.error('Error creating membership:', membershipError)
    // Clean up organization if membership creation fails
    await supabase.from('organizations').delete().eq('id', organization.id)
    return {
      error: 'Failed to create membership. Please try again.',
    }
  }

  // Redirect to org dashboard
  redirect(`/app/org/${organization.slug}`)
}

