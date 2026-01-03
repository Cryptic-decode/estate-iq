'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from './organizations'

type Unit = {
  id: string
  organization_id: string
  building_id: string
  unit_number: string
  created_at: string
  updated_at: string
}

type UnitFormData = {
  building_id: string
  unit_number: string
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
 * List all units for an organization (optionally filtered by building)
 */
export async function listUnits(
  orgSlug: string,
  buildingId?: string
): Promise<{
  data: Unit[] | null
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

  let query = supabase
    .from('units')
    .select('*')
    .eq('organization_id', orgResult.organizationId)

  if (buildingId) {
    query = query.eq('building_id', buildingId)
  }

  const { data: units, error } = await query.order('unit_number', { ascending: true })

  if (error) {
    console.error('Error fetching units:', error)
    return { data: null, error: 'Failed to fetch units' }
  }

  return { data: units as Unit[], error: null }
}

/**
 * Create a new unit
 */
export async function createUnit(
  orgSlug: string,
  formData: UnitFormData
): Promise<{ data: Unit | null; error: string | null }> {
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
  if (!formData.unit_number || formData.unit_number.trim().length === 0) {
    return { data: null, error: 'Unit number is required' }
  }

  if (!formData.building_id || formData.building_id.trim().length === 0) {
    return { data: null, error: 'Building is required' }
  }

  // Verify building belongs to the same org
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', formData.building_id)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (buildingError || !building) {
    return { data: null, error: 'Building not found or does not belong to this organization' }
  }

  const { data: unit, error } = await supabase
    .from('units')
    .insert({
      organization_id: orgResult.organizationId,
      building_id: formData.building_id,
      unit_number: formData.unit_number.trim(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating unit:', error)
    return { data: null, error: 'Failed to create unit' }
  }

  return { data: unit as Unit, error: null }
}

/**
 * Update a unit
 */
export async function updateUnit(
  orgSlug: string,
  unitId: string,
  formData: UnitFormData
): Promise<{ data: Unit | null; error: string | null }> {
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
  if (!formData.unit_number || formData.unit_number.trim().length === 0) {
    return { data: null, error: 'Unit number is required' }
  }

  if (!formData.building_id || formData.building_id.trim().length === 0) {
    return { data: null, error: 'Building is required' }
  }

  // Verify unit belongs to org
  const { data: existingUnit, error: unitError } = await supabase
    .from('units')
    .select('id, organization_id')
    .eq('id', unitId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (unitError || !existingUnit) {
    return { data: null, error: 'Unit not found or access denied' }
  }

  // Verify new building belongs to the same org
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', formData.building_id)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (buildingError || !building) {
    return { data: null, error: 'Building not found or does not belong to this organization' }
  }

  const { data: unit, error } = await supabase
    .from('units')
    .update({
      building_id: formData.building_id,
      unit_number: formData.unit_number.trim(),
    })
    .eq('id', unitId)
    .eq('organization_id', orgResult.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating unit:', error)
    return { data: null, error: 'Failed to update unit' }
  }

  return { data: unit as Unit, error: null }
}

/**
 * Delete a unit (OWNER only)
 */
export async function deleteUnit(
  orgSlug: string,
  unitId: string
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
    return { error: 'Only organization owners can delete units' }
  }

  // Verify unit belongs to org
  const { data: existingUnit, error: unitError } = await supabase
    .from('units')
    .select('id, organization_id')
    .eq('id', unitId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (unitError || !existingUnit) {
    return { error: 'Unit not found or access denied' }
  }

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', unitId)
    .eq('organization_id', orgResult.organizationId)

  if (error) {
    console.error('Error deleting unit:', error)
    return { error: 'Failed to delete unit' }
  }

  return { error: null }
}

