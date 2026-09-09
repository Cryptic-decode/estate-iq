'use server'

import { createClient } from '@/lib/supabase/server'
import {
  buildUniqueLookup,
  isValidIsoDate,
  normalizeImportLookup,
  parseXlsxImport,
} from '@/lib/utils/xlsx-import'
import { getOrgContextForUser } from './_org-context'

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

type RentConfigImportRowResult = {
  rowNumber: number
  building_name: string
  unit_number: string
  tenant_name: string
  tenant_email: string
  active_from: string
  amount: string
  cycle: string
  due_day: string
  status: 'valid' | 'invalid'
  error: string | null
}

type RentConfigImportAnalysis = {
  rows: RentConfigImportRowResult[]
  validRows: Array<{
    occupancy_id: string
    amount: number
    cycle: RentConfig['cycle']
    due_day: number
  }>
  totalRows: number
  validCount: number
  invalidCount: number
}

const RENT_CONFIG_IMPORT_HEADERS = [
  'building_name',
  'unit_number',
  'tenant_name',
  'tenant_email',
  'active_from',
  'amount',
  'cycle',
  'due_day',
] as const

const RENT_CYCLES: RentConfig['cycle'][] = ['MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY']

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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  let query = supabase
    .from('rent_configs')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)

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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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

  const dueDayMax = formData.cycle === 'WEEKLY' ? 7 : 31
  if (!formData.due_day || formData.due_day < 1 || formData.due_day > dueDayMax) {
    return {
      data: null,
      error: formData.cycle === 'WEEKLY' ? 'Due weekday must be between 1 and 7' : 'Due day must be between 1 and 31',
    }
  }

  // Verify occupancy belongs to the same org
  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', formData.occupancy_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (occupancyError || !occupancy) {
    return { data: null, error: 'Occupancy not found or does not belong to this organization' }
  }

  const { data: rentConfig, error } = await supabase
    .from('rent_configs')
    .insert({
      organization_id: orgRes.data.organizationId,
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

export async function previewRentConfigImport(
  orgSlug: string,
  file: File
): Promise<{ data: RentConfigImportAnalysis | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  const parsed = await parseXlsxImport(file, RENT_CONFIG_IMPORT_HEADERS, 'rent schedule')
  if (parsed.error) return { data: null, error: parsed.error }

  const organizationId = orgRes.data.organizationId
  const [buildingsRes, unitsRes, tenantsRes, occupanciesRes, rentConfigsRes] = await Promise.all([
    supabase.from('buildings').select('id, name').eq('organization_id', organizationId),
    supabase.from('units').select('id, building_id, unit_number').eq('organization_id', organizationId),
    supabase.from('tenants').select('id, full_name, email').eq('organization_id', organizationId),
    supabase.from('occupancies').select('id, unit_id, tenant_id, active_from').eq('organization_id', organizationId),
    supabase.from('rent_configs').select('occupancy_id').eq('organization_id', organizationId),
  ])
  if (buildingsRes.error || unitsRes.error || tenantsRes.error || occupanciesRes.error || rentConfigsRes.error) {
    console.error('Error loading rent schedule import references:', {
      buildings: buildingsRes.error,
      units: unitsRes.error,
      tenants: tenantsRes.error,
      occupancies: occupanciesRes.error,
      rentConfigs: rentConfigsRes.error,
    })
    return { data: null, error: 'Failed to validate rent schedule references' }
  }

  const buildings = buildUniqueLookup(
    buildingsRes.data ?? [],
    (building) => normalizeImportLookup(building.name),
    (building) => building.id
  )
  const units = buildUniqueLookup(
    unitsRes.data ?? [],
    (unit) => `${unit.building_id}::${normalizeImportLookup(unit.unit_number)}`,
    (unit) => unit.id
  )
  const tenantsByName = buildUniqueLookup(
    tenantsRes.data ?? [],
    (tenant) => normalizeImportLookup(tenant.full_name),
    (tenant) => tenant.id
  )
  const tenantsByEmail = buildUniqueLookup(
    (tenantsRes.data ?? []).filter((tenant) => tenant.email),
    (tenant) => normalizeImportLookup(tenant.email ?? ''),
    (tenant) => tenant.id
  )
  const tenantNamesById = new Map(
    (tenantsRes.data ?? []).map((tenant) => [tenant.id, normalizeImportLookup(tenant.full_name)])
  )
  const occupancies = buildUniqueLookup(
    occupanciesRes.data ?? [],
    (occupancy) => `${occupancy.unit_id}::${occupancy.tenant_id}::${occupancy.active_from}`,
    (occupancy) => occupancy.id
  )
  const configuredOccupancyIds = new Set((rentConfigsRes.data ?? []).map((config) => config.occupancy_id))
  const seenOccupancyIds = new Set<string>()
  const rows: RentConfigImportRowResult[] = []
  const validRows: RentConfigImportAnalysis['validRows'] = []

  for (const parsedRow of parsed.rows) {
    const values = parsedRow.values
    const buildingName = values.building_name
    const unitNumber = values.unit_number
    const tenantName = values.tenant_name
    const tenantEmail = values.tenant_email
    const activeFrom = values.active_from
    const amountText = values.amount
    const cycleText = values.cycle.toUpperCase()
    const dueDayText = values.due_day
    const amount = Number(amountText)
    const dueDay = Number(dueDayText)
    const buildingKey = normalizeImportLookup(buildingName)
    const tenantKey = normalizeImportLookup(tenantName)
    const tenantEmailKey = normalizeImportLookup(tenantEmail)
    let error: string | null = null

    if (!buildingName || !unitNumber || !tenantName || !activeFrom || !amountText || !cycleText || !dueDayText) {
      error = 'Every column is required.'
    } else if (!isValidIsoDate(activeFrom)) {
      error = 'Active from date must use YYYY-MM-DD format.'
    } else if (!Number.isFinite(amount) || amount <= 0) {
      error = 'Amount must be greater than 0.'
    } else if (!RENT_CYCLES.includes(cycleText as RentConfig['cycle'])) {
      error = 'Cycle must be MONTHLY, WEEKLY, QUARTERLY, or YEARLY.'
    } else if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > (cycleText === 'WEEKLY' ? 7 : 31)) {
      error = cycleText === 'WEEKLY' ? 'Due weekday must be between 1 and 7.' : 'Due day must be between 1 and 31.'
    } else if (buildings.ambiguous.has(buildingKey)) {
      error = 'Building name is ambiguous.'
    } else if (!tenantEmail && tenantsByName.ambiguous.has(tenantKey)) {
      error = 'Tenant name is ambiguous. Add tenant_email to identify the correct tenant.'
    } else if (tenantEmail && tenantsByEmail.ambiguous.has(tenantEmailKey)) {
      error = 'Tenant email is ambiguous.'
    }

    const buildingId = error ? null : buildings.values.get(buildingKey) ?? null
    if (!error && !buildingId) error = 'Building not found.'
    const unitKey = buildingId ? `${buildingId}::${normalizeImportLookup(unitNumber)}` : ''
    if (!error && units.ambiguous.has(unitKey)) error = 'Unit is ambiguous within this building.'
    const unitId = error ? null : units.values.get(unitKey) ?? null
    if (!error && !unitId) error = 'Unit not found in this building.'
    const tenantId = error
      ? null
      : tenantEmail
        ? tenantsByEmail.values.get(tenantEmailKey) ?? null
        : tenantsByName.values.get(tenantKey) ?? null
    if (!error && !tenantId) error = tenantEmail ? 'Tenant email not found.' : 'Tenant not found.'
    if (!error && tenantId && tenantNamesById.get(tenantId) !== tenantKey) {
      error = 'Tenant name does not match the supplied tenant email.'
    }
    const occupancyKey = unitId && tenantId ? `${unitId}::${tenantId}::${activeFrom}` : ''
    if (!error && occupancies.ambiguous.has(occupancyKey)) error = 'Occupancy match is ambiguous.'
    const occupancyId = error ? null : occupancies.values.get(occupancyKey) ?? null
    if (!error && !occupancyId) error = 'Matching occupancy not found.'
    if (!error && occupancyId && configuredOccupancyIds.has(occupancyId)) {
      error = 'This occupancy already has a rent schedule.'
    }
    if (!error && occupancyId && seenOccupancyIds.has(occupancyId)) {
      error = 'Duplicate rent schedule in file.'
    }

    rows.push({
      rowNumber: parsedRow.rowNumber,
      building_name: buildingName,
      unit_number: unitNumber,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
      active_from: activeFrom,
      amount: amountText,
      cycle: cycleText,
      due_day: dueDayText,
      status: error ? 'invalid' : 'valid',
      error,
    })
    if (!error && occupancyId) {
      seenOccupancyIds.add(occupancyId)
      validRows.push({
        occupancy_id: occupancyId,
        amount,
        cycle: cycleText as RentConfig['cycle'],
        due_day: dueDay,
      })
    }
  }

  return {
    data: {
      rows,
      validRows,
      totalRows: rows.length,
      validCount: validRows.length,
      invalidCount: rows.length - validRows.length,
    },
    error: null,
  }
}

export async function importRentConfigsFromXlsx(
  orgSlug: string,
  file: File
): Promise<{
  data: { insertedCount: number; totalRows: number; rows: RentConfigImportRowResult[] } | null
  error: string | null
}> {
  const preview = await previewRentConfigImport(orgSlug, file)
  if (preview.error || !preview.data) {
    return { data: null, error: preview.error ?? 'Failed to validate rent schedule import' }
  }
  if (preview.data.invalidCount > 0) {
    return {
      data: { insertedCount: 0, totalRows: preview.data.totalRows, rows: preview.data.rows },
      error: 'Import contains invalid rows. Resolve the errors and retry.',
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  const organizationId = orgRes.data.organizationId
  const payload = preview.data.validRows.map((row) => ({ organization_id: organizationId, ...row }))
  const { error } = await supabase.from('rent_configs').insert(payload)
  if (error) {
    console.error('Error bulk inserting rent schedules:', error)
    return { data: null, error: 'Failed to import rent schedules' }
  }

  return {
    data: { insertedCount: payload.length, totalRows: preview.data.totalRows, rows: preview.data.rows },
    error: null,
  }
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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

  const dueDayMax = formData.cycle === 'WEEKLY' ? 7 : 31
  if (!formData.due_day || formData.due_day < 1 || formData.due_day > dueDayMax) {
    return {
      data: null,
      error: formData.cycle === 'WEEKLY' ? 'Due weekday must be between 1 and 7' : 'Due day must be between 1 and 31',
    }
  }

  // Verify rent config belongs to org
  const { data: existingRentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id')
    .eq('id', rentConfigId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentConfigError || !existingRentConfig) {
    return { data: null, error: 'Rent config not found or access denied' }
  }

  // Verify new occupancy belongs to the same org
  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, organization_id')
    .eq('id', formData.occupancy_id)
    .eq('organization_id', orgRes.data.organizationId)
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
    .eq('organization_id', orgRes.data.organizationId)
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { error: orgRes.error }

  // Validate role: Only OWNER can delete
  if (orgRes.data.role !== 'OWNER') {
    return { error: 'Only organization owners can delete rent configs' }
  }

  // Verify rent config belongs to org
  const { data: existingRentConfig, error: rentConfigError } = await supabase
    .from('rent_configs')
    .select('id, organization_id')
    .eq('id', rentConfigId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentConfigError || !existingRentConfig) {
    return { error: 'Rent config not found or access denied' }
  }

  const { error } = await supabase
    .from('rent_configs')
    .delete()
    .eq('id', rentConfigId)
    .eq('organization_id', orgRes.data.organizationId)

  if (error) {
    console.error('Error deleting rent config:', error)
    return { error: 'Failed to delete rent config' }
  }

  return { error: null }
}
