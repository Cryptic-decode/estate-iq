'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'

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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  let query = supabase
    .from('rent_periods')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)

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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentConfigError || !rentConfig) {
    return { data: null, error: 'Rent config not found or does not belong to this organization' }
  }

  // Insert rent period (status defaults to 'DUE', days_overdue will be calculated by trigger)
  const { data: rentPeriod, error } = await supabase
    .from('rent_periods')
    .insert({
      organization_id: orgRes.data.organizationId,
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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
    .eq('organization_id', orgRes.data.organizationId)
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
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating rent period status:', error)
    return { data: null, error: 'Failed to update rent period status' }
  }

  return { data: rentPeriod as RentPeriod, error: null }
}

/**
 * Generate the next rent period for a rent config
 * Calculates period dates based on cycle and due_day, starting from the last period or occupancy start date
 */
export async function generateNextRentPeriod(
  orgSlug: string,
  rentConfigId: string
): Promise<{ data: RentPeriod | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can generate
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Fetch rent config
  const { data: rentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id, occupancy_id, cycle, due_day')
    .eq('id', rentConfigId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentConfigError || !rentConfig) {
    return { data: null, error: 'Rent config not found or does not belong to this organization' }
  }

  // Fetch occupancy details
  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('active_from, active_to')
    .eq('id', rentConfig.occupancy_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (occupancyError || !occupancy) {
    return { data: null, error: 'Occupancy not found for this rent config' }
  }

  // Find the last period for this rent config to determine the next period start
  const { data: lastPeriod } = await supabase
    .from('rent_periods')
    .select('period_end, due_date')
    .eq('rent_config_id', rentConfigId)
    .eq('organization_id', orgRes.data.organizationId)
    .order('period_end', { ascending: false })
    .limit(1)
    .single()

  // Determine period start date
  let periodStart: Date
  if (lastPeriod?.period_end) {
    // Start from day after last period ends
    periodStart = new Date(lastPeriod.period_end)
    periodStart.setDate(periodStart.getDate() + 1)
  } else {
    // First period: start from occupancy active_from
    periodStart = new Date(occupancy.active_from)
  }

  // Check if occupancy is still active
  const occupancyEnd = occupancy.active_to ? new Date(occupancy.active_to) : null
  if (occupancyEnd && periodStart > occupancyEnd) {
    return { data: null, error: 'Cannot generate period: occupancy has ended' }
  }

  // Calculate period end based on cycle
  const periodEnd = new Date(periodStart)
  switch (rentConfig.cycle) {
    case 'WEEKLY':
      periodEnd.setDate(periodEnd.getDate() + 6) // 7 days total (start + 6 more)
      break
    case 'MONTHLY': {
      // Move to next month, then go back one day to get last day of current month
      const nextMonth = new Date(periodStart)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(0) // Last day of the month before nextMonth
      periodEnd.setTime(nextMonth.getTime())
      break
    }
    case 'QUARTERLY': {
      const nextQuarter = new Date(periodStart)
      nextQuarter.setMonth(nextQuarter.getMonth() + 3)
      nextQuarter.setDate(0) // Last day of the month before nextQuarter
      periodEnd.setTime(nextQuarter.getTime())
      break
    }
    case 'YEARLY': {
      const nextYear = new Date(periodStart)
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      nextYear.setDate(0) // Last day of the month before nextYear
      periodEnd.setTime(nextYear.getTime())
      break
    }
  }

  // Ensure period doesn't extend beyond occupancy end
  if (occupancyEnd && periodEnd > occupancyEnd) {
    periodEnd.setTime(occupancyEnd.getTime())
  }

  // Calculate due date: due_day of the period start month/year
  const dueDate = new Date(periodStart.getFullYear(), periodStart.getMonth(), rentConfig.due_day)

  // If due_day is before period start, move to next month
  if (dueDate < periodStart) {
    dueDate.setMonth(dueDate.getMonth() + 1)
    // Handle edge case where due_day doesn't exist in next month (e.g., Feb 31)
    const lastDayOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0).getDate()
    dueDate.setDate(Math.min(rentConfig.due_day, lastDayOfMonth))
  }

  // Create the rent period
  const { data: rentPeriod, error } = await supabase
    .from('rent_periods')
    .insert({
      organization_id: orgRes.data.organizationId,
      rent_config_id: rentConfigId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      status: 'DUE',
    })
    .select()
    .single()

  if (error) {
    console.error('Error generating rent period:', error)
    return { data: null, error: 'Failed to generate rent period' }
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Verify rent period belongs to org
  const { data: existingRentPeriod, error: rentPeriodError } = await supabase
    .from('rent_periods')
    .select('*')
    .eq('id', rentPeriodId)
    .eq('organization_id', orgRes.data.organizationId)
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
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating rent period dates:', error)
    return { data: null, error: 'Failed to update rent period dates' }
  }

  return { data: rentPeriod as RentPeriod, error: null }
}

