'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from './organizations'

type RentConfig = {
  id: string
  organization_id: string
  occupancy_id: string
  amount: number
  cycle: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'
  due_day: number
  created_at: string
  updated_at: string
}

type RentConfigFormData = {
  occupancy_id: string
  amount: number
  cycle: 'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'
  due_day: number
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
 * List all rent configs for an organization (optionally filtered by occupancy)
 */
export async function listRentConfigs(
  orgSlug: string,
  occupancyId?: string
): Promise<{
  data: RentConfig[] | null
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
    .from('rent_configs')
    .select('*')
    .eq('organization_id', orgResult.organizationId)

  if (occupancyId) {
    query = query.eq('occupancy_id', occupancyId)
  }

  const { data: rentConfigs, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching rent configs:', error)
    return { data: null, error: 'Failed to fetch rent configs' }
  }

  return { data: rentConfigs as RentConfig[], error: null }
}

/**
 * Create a new rent config
 */
export async function createRentConfig(
  orgSlug: string,
  formData: RentConfigFormData
): Promise<{ data: RentConfig | null; error: string | null }> {
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
  if (!formData.occupancy_id || formData.occupancy_id.trim().length === 0) {
    return { data: null, error: 'Occupancy is required' }
  }

  if (!formData.amount || formData.amount <= 0) {
    return { data: null, error: 'Amount must be greater than 0' }
  }

  const validCycles = ['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY']
  if (!validCycles.includes(formData.cycle)) {
    return { data: null, error: 'Cycle must be one of: MONTHLY, WEEKLY, QUARTERLY, YEARLY' }
  }

  if (!formData.due_day || formData.due_day < 1 || formData.due_day > 31) {
    return { data: null, error: 'Due day must be between 1 and 31' }
  }

  // Verify occupancy belongs to the same org
  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', formData.occupancy_id)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (occupancyError || !occupancy) {
    return { data: null, error: 'Occupancy not found or does not belong to this organization' }
  }

  const { data: rentConfig, error } = await supabase
    .from('rent_configs')
    .insert({
      organization_id: orgResult.organizationId,
      occupancy_id: formData.occupancy_id,
      amount: formData.amount,
      cycle: formData.cycle,
      due_day: formData.due_day,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating rent config:', error)
    return { data: null, error: 'Failed to create rent config' }
  }

  return { data: rentConfig as RentConfig, error: null }
}

/**
 * Update a rent config
 */
export async function updateRentConfig(
  orgSlug: string,
  rentConfigId: string,
  formData: RentConfigFormData
): Promise<{ data: RentConfig | null; error: string | null }> {
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
  if (!formData.occupancy_id || formData.occupancy_id.trim().length === 0) {
    return { data: null, error: 'Occupancy is required' }
  }

  if (!formData.amount || formData.amount <= 0) {
    return { data: null, error: 'Amount must be greater than 0' }
  }

  const validCycles = ['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY']
  if (!validCycles.includes(formData.cycle)) {
    return { data: null, error: 'Cycle must be one of: MONTHLY, WEEKLY, QUARTERLY, YEARLY' }
  }

  if (!formData.due_day || formData.due_day < 1 || formData.due_day > 31) {
    return { data: null, error: 'Due day must be between 1 and 31' }
  }

  // Verify rent config belongs to org
  const { data: existingRentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id')
    .eq('id', rentConfigId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (rentConfigError || !existingRentConfig) {
    return { data: null, error: 'Rent config not found or access denied' }
  }

  // Verify new occupancy belongs to the same org
  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', formData.occupancy_id)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (occupancyError || !occupancy) {
    return { data: null, error: 'Occupancy not found or does not belong to this organization' }
  }

  const { data: rentConfig, error } = await supabase
    .from('rent_configs')
    .update({
      occupancy_id: formData.occupancy_id,
      amount: formData.amount,
      cycle: formData.cycle,
      due_day: formData.due_day,
    })
    .eq('id', rentConfigId)
    .eq('organization_id', orgResult.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating rent config:', error)
    return { data: null, error: 'Failed to update rent config' }
  }

  return { data: rentConfig as RentConfig, error: null }
}

/**
 * Delete a rent config (OWNER only)
 */
export async function deleteRentConfig(
  orgSlug: string,
  rentConfigId: string
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
    return { error: 'Only organization owners can delete rent configs' }
  }

  // Verify rent config belongs to org
  const { data: existingRentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id')
    .eq('id', rentConfigId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (rentConfigError || !existingRentConfig) {
    return { error: 'Rent config not found or access denied' }
  }

  const { error } = await supabase
    .from('rent_configs')
    .delete()
    .eq('id', rentConfigId)
    .eq('organization_id', orgResult.organizationId)

  if (error) {
    console.error('Error deleting rent config:', error)
    return { error: 'Failed to delete rent config' }
  }

  return { error: null }
}

