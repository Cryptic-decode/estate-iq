'use server'

import { createClient } from '@/lib/supabase/server'
import {
  buildUniqueLookup,
  isValidIsoDate,
  normalizeImportLookup,
  parseXlsxImport,
} from '@/lib/utils/xlsx-import'
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

type OccupancyImportRowResult = {
  rowNumber: number
  building_name: string
  unit_number: string
  tenant_name: string
  tenant_email: string
  active_from: string
  active_to: string
  status: 'valid' | 'invalid'
  error: string | null
}

type OccupancyImportAnalysis = {
  rows: OccupancyImportRowResult[]
  validRows: Array<{
    unit_id: string
    tenant_id: string
    active_from: string
    active_to: string | null
  }>
  totalRows: number
  validCount: number
  invalidCount: number
}

const OCCUPANCY_IMPORT_HEADERS = [
  'building_name',
  'unit_number',
  'tenant_name',
  'tenant_email',
  'active_from',
  'active_to',
] as const

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

export async function previewOccupancyImport(
  orgSlug: string,
  file: File
): Promise<{ data: OccupancyImportAnalysis | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  const parsed = await parseXlsxImport(file, OCCUPANCY_IMPORT_HEADERS, 'occupancy')
  if (parsed.error) return { data: null, error: parsed.error }

  const organizationId = orgRes.data.organizationId
  const [buildingsRes, unitsRes, tenantsRes, occupanciesRes] = await Promise.all([
    supabase.from('buildings').select('id, name').eq('organization_id', organizationId),
    supabase.from('units').select('id, building_id, unit_number').eq('organization_id', organizationId),
    supabase.from('tenants').select('id, full_name, email').eq('organization_id', organizationId),
    supabase.from('occupancies').select('unit_id, tenant_id, active_from').eq('organization_id', organizationId),
  ])
  if (buildingsRes.error || unitsRes.error || tenantsRes.error || occupanciesRes.error) {
    console.error('Error loading occupancy import references:', {
      buildings: buildingsRes.error,
      units: unitsRes.error,
      tenants: tenantsRes.error,
      occupancies: occupanciesRes.error,
    })
    return { data: null, error: 'Failed to validate occupancy references' }
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
  const existingKeys = new Set(
    (occupanciesRes.data ?? []).map(
      (occupancy) => `${occupancy.unit_id}::${occupancy.tenant_id}::${occupancy.active_from}`
    )
  )
  const seenKeys = new Set<string>()
  const rows: OccupancyImportRowResult[] = []
  const validRows: OccupancyImportAnalysis['validRows'] = []

  for (const parsedRow of parsed.rows) {
    const values = parsedRow.values
    const buildingName = values.building_name
    const unitNumber = values.unit_number
    const tenantName = values.tenant_name
    const tenantEmail = values.tenant_email
    const activeFrom = values.active_from
    const activeTo = values.active_to
    const buildingKey = normalizeImportLookup(buildingName)
    const tenantKey = normalizeImportLookup(tenantName)
    const tenantEmailKey = normalizeImportLookup(tenantEmail)
    let error: string | null = null

    if (!buildingName || !unitNumber || !tenantName || !activeFrom) {
      error = 'Building, unit, tenant, and active from date are required.'
    } else if (!isValidIsoDate(activeFrom) || (activeTo && !isValidIsoDate(activeTo))) {
      error = 'Dates must use YYYY-MM-DD format.'
    } else if (activeTo && activeTo < activeFrom) {
      error = 'Active to date must be on or after active from date.'
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
    if (!error && existingKeys.has(occupancyKey)) error = 'This occupancy already exists.'
    if (!error && seenKeys.has(occupancyKey)) error = 'Duplicate occupancy in file.'

    rows.push({
      rowNumber: parsedRow.rowNumber,
      building_name: buildingName,
      unit_number: unitNumber,
      tenant_name: tenantName,
      tenant_email: tenantEmail,
      active_from: activeFrom,
      active_to: activeTo,
      status: error ? 'invalid' : 'valid',
      error,
    })
    if (!error && unitId && tenantId) {
      seenKeys.add(occupancyKey)
      validRows.push({ unit_id: unitId, tenant_id: tenantId, active_from: activeFrom, active_to: activeTo || null })
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

export async function importOccupanciesFromXlsx(
  orgSlug: string,
  file: File
): Promise<{
  data: { insertedCount: number; totalRows: number; rows: OccupancyImportRowResult[] } | null
  error: string | null
}> {
  const preview = await previewOccupancyImport(orgSlug, file)
  if (preview.error || !preview.data) {
    return { data: null, error: preview.error ?? 'Failed to validate occupancy import' }
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
  const { error } = await supabase.from('occupancies').insert(payload)
  if (error) {
    console.error('Error bulk inserting occupancies:', error)
    return { data: null, error: 'Failed to import occupancies' }
  }

  return {
    data: { insertedCount: payload.length, totalRows: preview.data.totalRows, rows: preview.data.rows },
    error: null,
  }
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
