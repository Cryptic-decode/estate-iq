'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'

type Occupancy = {
  id: string
  organization_id: string
  unit_id: string
  tenant_id: string
  active_from: string
  active_to: string | null
  created_at: string
  updated_at: string
}

type OccupancyFormData = {
  unit_id: string
  tenant_id: string
  active_from: string // ISO date string
  active_to?: string | null // ISO date string or null
}

/**
 * List all occupancies for an organization (optionally filtered by unit or tenant)
 */
export async function listOccupancies(
  orgSlug: string,
  filters?: { unitId?: string; tenantId?: string }
): Promise<{
  data: Occupancy[] | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  let query = supabase
    .from('occupancies')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)

  if (filters?.unitId) {
    query = query.eq('unit_id', filters.unitId)
  }

  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId)
  }

  const { data: occupancies, error } = await query.order('active_from', { ascending: false })

  if (error) {
    console.error('Error fetching occupancies:', error)
    return { data: null, error: 'Failed to fetch occupancies' }
  }

  return { data: occupancies as Occupancy[], error: null }
}

/**
 * Create a new occupancy
 */
export async function createOccupancy(
  orgSlug: string,
  formData: OccupancyFormData
): Promise<{ data: Occupancy | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.unit_id || formData.unit_id.trim().length === 0) {
    return { data: null, error: 'Unit is required' }
  }

  if (!formData.tenant_id || formData.tenant_id.trim().length === 0) {
    return { data: null, error: 'Tenant is required' }
  }

  if (!formData.active_from) {
    return { data: null, error: 'Active from date is required' }
  }

  // Validate date range
  if (formData.active_to) {
    const fromDate = new Date(formData.active_from)
    const toDate = new Date(formData.active_to)
    if (toDate < fromDate) {
      return { data: null, error: 'Active to date must be after or equal to active from date' }
    }
  }

  // Verify unit belongs to the same org
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, organization_id')
    .eq('id', formData.unit_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (unitError || !unit) {
    return { data: null, error: 'Unit not found or does not belong to this organization' }
  }

  // Verify tenant belongs to the same org
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('id', formData.tenant_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (tenantError || !tenant) {
    return { data: null, error: 'Tenant not found or does not belong to this organization' }
  }

  const { data: occupancy, error } = await supabase
    .from('occupancies')
    .insert({
      organization_id: orgRes.data.organizationId,
      unit_id: formData.unit_id,
      tenant_id: formData.tenant_id,
      active_from: formData.active_from,
      active_to: formData.active_to || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating occupancy:', error)
    return { data: null, error: 'Failed to create occupancy' }
  }

  return { data: occupancy as Occupancy, error: null }
}

/**
 * Update an occupancy
 */
export async function updateOccupancy(
  orgSlug: string,
  occupancyId: string,
  formData: OccupancyFormData
): Promise<{ data: Occupancy | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.unit_id || formData.unit_id.trim().length === 0) {
    return { data: null, error: 'Unit is required' }
  }

  if (!formData.tenant_id || formData.tenant_id.trim().length === 0) {
    return { data: null, error: 'Tenant is required' }
  }

  if (!formData.active_from) {
    return { data: null, error: 'Active from date is required' }
  }

  // Validate date range
  if (formData.active_to) {
    const fromDate = new Date(formData.active_from)
    const toDate = new Date(formData.active_to)
    if (toDate < fromDate) {
      return { data: null, error: 'Active to date must be after or equal to active from date' }
    }
  }

  // Verify occupancy belongs to org
  const { data: existingOccupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', occupancyId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (occupancyError || !existingOccupancy) {
    return { data: null, error: 'Occupancy not found or access denied' }
  }

  // Verify new unit belongs to the same org
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, organization_id')
    .eq('id', formData.unit_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (unitError || !unit) {
    return { data: null, error: 'Unit not found or does not belong to this organization' }
  }

  // Verify new tenant belongs to the same org
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('id', formData.tenant_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (tenantError || !tenant) {
    return { data: null, error: 'Tenant not found or does not belong to this organization' }
  }

  const { data: occupancy, error } = await supabase
    .from('occupancies')
    .update({
      unit_id: formData.unit_id,
      tenant_id: formData.tenant_id,
      active_from: formData.active_from,
      active_to: formData.active_to || null,
    })
    .eq('id', occupancyId)
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating occupancy:', error)
    return { data: null, error: 'Failed to update occupancy' }
  }

  return { data: occupancy as Occupancy, error: null }
}

/**
 * Delete an occupancy (OWNER only)
 */
export async function deleteOccupancy(
  orgSlug: string,
  occupancyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { error: orgRes.error }

  // Validate role: Only OWNER can delete
  if (orgRes.data.role !== 'OWNER') {
    return { error: 'Only organization owners can delete occupancies' }
  }

  // Verify occupancy belongs to org
  const { data: existingOccupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', occupancyId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (occupancyError || !existingOccupancy) {
    return { error: 'Occupancy not found or access denied' }
  }

  const { error } = await supabase
    .from('occupancies')
    .delete()
    .eq('id', occupancyId)
    .eq('organization_id', orgRes.data.organizationId)

  if (error) {
    console.error('Error deleting occupancy:', error)
    return { error: 'Failed to delete occupancy' }
  }

  return { error: null }
}

