'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from './organizations'

type RentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'DUE' | 'PAID' | 'OVERDUE'
  days_overdue: number
  created_at: string
  updated_at: string
}

type RentPeriodFormData = {
  rent_config_id: string
  period_start: string // ISO date string
  period_end: string // ISO date string
  due_date: string // ISO date string
}

type RentPeriodStatusUpdate = {
  status: 'DUE' | 'PAID' | 'OVERDUE'
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
 * List all rent periods for an organization (with optional filters)
 */
export async function listRentPeriods(
  orgSlug: string,
  filters?: {
    rentConfigId?: string
    status?: 'DUE' | 'PAID' | 'OVERDUE'
    overdueOnly?: boolean
  }
): Promise<{
  data: RentPeriod[] | null
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
    .from('rent_periods')
    .select('*')
    .eq('organization_id', orgResult.organizationId)

  if (filters?.rentConfigId) {
    query = query.eq('rent_config_id', filters.rentConfigId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.overdueOnly) {
    query = query.gt('days_overdue', 0)
  }

  const { data: rentPeriods, error } = await query.order('due_date', { ascending: false })

  if (error) {
    console.error('Error fetching rent periods:', error)
    return { data: null, error: 'Failed to fetch rent periods' }
  }

  return { data: rentPeriods as RentPeriod[], error: null }
}

/**
 * Create a new rent period
 */
export async function createRentPeriod(
  orgSlug: string,
  formData: RentPeriodFormData
): Promise<{ data: RentPeriod | null; error: string | null }> {
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
  if (!formData.rent_config_id || formData.rent_config_id.trim().length === 0) {
    return { data: null, error: 'Rent config is required' }
  }

  if (!formData.period_start || !formData.period_end || !formData.due_date) {
    return { data: null, error: 'All dates are required' }
  }

  // Validate date range
  const periodStart = new Date(formData.period_start)
  const periodEnd = new Date(formData.period_end)
  const dueDate = new Date(formData.due_date)

  if (periodEnd < periodStart) {
    return { data: null, error: 'Period end date must be after or equal to period start date' }
  }

  // Verify rent config belongs to the same org
  const { data: rentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id')
    .eq('id', formData.rent_config_id)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (rentConfigError || !rentConfig) {
    return { data: null, error: 'Rent config not found or does not belong to this organization' }
  }

  // Insert rent period (status defaults to 'DUE', days_overdue will be calculated by trigger)
  const { data: rentPeriod, error } = await supabase
    .from('rent_periods')
    .insert({
      organization_id: orgResult.organizationId,
      rent_config_id: formData.rent_config_id,
      period_start: formData.period_start,
      period_end: formData.period_end,
      due_date: formData.due_date,
      status: 'DUE', // Default status
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating rent period:', error)
    return { data: null, error: 'Failed to create rent period' }
  }

  return { data: rentPeriod as RentPeriod, error: null }
}

/**
 * Update rent period status (triggers days_overdue recalculation via database trigger)
 */
export async function updateRentPeriodStatus(
  orgSlug: string,
  rentPeriodId: string,
  statusUpdate: RentPeriodStatusUpdate
): Promise<{ data: RentPeriod | null; error: string | null }> {
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

  // Validate status
  const validStatuses = ['DUE', 'PAID', 'OVERDUE']
  if (!validStatuses.includes(statusUpdate.status)) {
    return { data: null, error: 'Invalid status. Must be one of: DUE, PAID, OVERDUE' }
  }

  // Verify rent period belongs to org
  const { data: existingRentPeriod, error: rentPeriodError } = await supabase
    .from('rent_periods')
    .select('id, organization_id')
    .eq('id', rentPeriodId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (rentPeriodError || !existingRentPeriod) {
    return { data: null, error: 'Rent period not found or access denied' }
  }

  // Update status (database trigger will recalculate days_overdue)
  const { data: rentPeriod, error } = await supabase
    .from('rent_periods')
    .update({
      status: statusUpdate.status,
    })
    .eq('id', rentPeriodId)
    .eq('organization_id', orgResult.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating rent period status:', error)
    return { data: null, error: 'Failed to update rent period status' }
  }

  return { data: rentPeriod as RentPeriod, error: null }
}

/**
 * Update rent period dates (period_start, period_end, due_date)
 */
export async function updateRentPeriodDates(
  orgSlug: string,
  rentPeriodId: string,
  formData: {
    period_start?: string
    period_end?: string
    due_date?: string
  }
): Promise<{ data: RentPeriod | null; error: string | null }> {
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

  // Verify rent period belongs to org
  const { data: existingRentPeriod, error: rentPeriodError } = await supabase
    .from('rent_periods')
    .select('*')
    .eq('id', rentPeriodId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (rentPeriodError || !existingRentPeriod) {
    return { data: null, error: 'Rent period not found or access denied' }
  }

  // Prepare update data
  const updateData: {
    period_start?: string
    period_end?: string
    due_date?: string
  } = {}

  if (formData.period_start) {
    updateData.period_start = formData.period_start
  }

  if (formData.period_end) {
    updateData.period_end = formData.period_end
  }

  if (formData.due_date) {
    updateData.due_date = formData.due_date
  }

  // Validate date range if both dates are provided
  const periodStart = formData.period_start ? new Date(formData.period_start) : new Date(existingRentPeriod.period_start)
  const periodEnd = formData.period_end ? new Date(formData.period_end) : new Date(existingRentPeriod.period_end)

  if (periodEnd < periodStart) {
    return { data: null, error: 'Period end date must be after or equal to period start date' }
  }

  // Update dates (database trigger will recalculate days_overdue if due_date changes)
  const { data: rentPeriod, error } = await supabase
    .from('rent_periods')
    .update(updateData)
    .eq('id', rentPeriodId)
    .eq('organization_id', orgResult.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating rent period dates:', error)
    return { data: null, error: 'Failed to update rent period dates' }
  }

  return { data: rentPeriod as RentPeriod, error: null }
}

