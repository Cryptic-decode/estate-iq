'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from './organizations'

type Building = {
  id: string
  organization_id: string
  name: string
  address: string | null
  created_at: string
  updated_at: string
}

type BuildingFormData = {
  name: string
  address?: string
}

/**
 * Helper: Get organization_id from slug and validate user membership
 */
async function getOrgFromSlug(slug: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  const memberships = await getUserMemberships()
  if (!memberships || memberships.length === 0) {
    redirect('/app/onboarding')
  }

  const membership = memberships.find((m) => m.organization?.slug === slug)
  if (!membership || !membership.organization) {
    return { error: 'Organization not found or access denied' }
  }

  return {
    organizationId: membership.organization.id,
    role: membership.role,
  }
}

/**
 * List all buildings for an organization
 */
export async function listBuildings(orgSlug: string): Promise<{
  data: Building[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('organization_id', orgResult.organizationId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching buildings:', error)
    return { data: null, error: 'Failed to fetch buildings' }
  }

  return { data: buildings as Building[], error: null }
}

/**
 * Create a new building
 */
export async function createBuilding(
  orgSlug: string,
  formData: BuildingFormData
): Promise<{ data: Building | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgResult.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.name || formData.name.trim().length === 0) {
    return { data: null, error: 'Building name is required' }
  }

  const { data: building, error } = await supabase
    .from('buildings')
    .insert({
      organization_id: orgResult.organizationId,
      name: formData.name.trim(),
      address: formData.address?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating building:', error)
    return { data: null, error: 'Failed to create building' }
  }

  return { data: building as Building, error: null }
}

/**
 * Update a building
 */
export async function updateBuilding(
  orgSlug: string,
  buildingId: string,
  formData: BuildingFormData
): Promise<{ data: Building | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgResult.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.name || formData.name.trim().length === 0) {
    return { data: null, error: 'Building name is required' }
  }

  // Verify building belongs to org (RLS will also enforce this, but we validate explicitly)
  const { data: existingBuilding, error: fetchError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', buildingId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (fetchError || !existingBuilding) {
    return { data: null, error: 'Building not found or access denied' }
  }

  const { data: building, error } = await supabase
    .from('buildings')
    .update({
      name: formData.name.trim(),
      address: formData.address?.trim() || null,
    })
    .eq('id', buildingId)
    .eq('organization_id', orgResult.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating building:', error)
    return { data: null, error: 'Failed to update building' }
  }

  return { data: building as Building, error: null }
}

/**
 * Delete a building (OWNER only)
 */
export async function deleteBuilding(
  orgSlug: string,
  buildingId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { error: orgResult.error }
  }

  // Validate role: Only OWNER can delete
  if (orgResult.role !== 'OWNER') {
    return { error: 'Only organization owners can delete buildings' }
  }

  // Verify building belongs to org
  const { data: existingBuilding, error: fetchError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', buildingId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (fetchError || !existingBuilding) {
    return { error: 'Building not found or access denied' }
  }

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', buildingId)
    .eq('organization_id', orgResult.organizationId)

  if (error) {
    console.error('Error deleting building:', error)
    return { error: 'Failed to delete building' }
  }

  return { error: null }
}

