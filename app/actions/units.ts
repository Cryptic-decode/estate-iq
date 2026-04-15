'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'
import * as XLSX from 'xlsx'

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

type UnitImportRow = {
  rowNumber: number
  building_name: string
  unit_number: string
}

type UnitImportRowResult = {
  rowNumber: number
  building_name: string
  unit_number: string
  status: 'valid' | 'invalid'
  error: string | null
}

type UnitImportAnalysis = {
  rows: UnitImportRowResult[]
  validRows: Array<{ building_id: string; unit_number: string }>
  totalRows: number
  validCount: number
  invalidCount: number
}

const UNIT_IMPORT_HEADERS = ['building_name', 'unit_number'] as const
const MAX_UNIT_IMPORT_ROWS = 2000

function normalizeBuildingName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeUnitNumber(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseHeaderRow(headerRow: unknown[]): string[] {
  return headerRow.map((cell) => String(cell ?? '').trim().toLowerCase())
}

function validateImportHeaders(headers: string[]): string | null {
  const missingHeaders = UNIT_IMPORT_HEADERS.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return `Missing required header(s): ${missingHeaders.join(', ')}`
  }

  const extraHeaders = headers.filter(
    (h) => h.length > 0 && !UNIT_IMPORT_HEADERS.includes(h as (typeof UNIT_IMPORT_HEADERS)[number])
  )
  if (extraHeaders.length > 0) {
    return `Unexpected header(s): ${extraHeaders.join(', ')}`
  }

  return null
}

async function parseUnitsWorkbook(file: File): Promise<{ rows: UnitImportRow[]; error: string | null }> {
  if (!file || file.size === 0) {
    return { rows: [], error: 'Please upload a non-empty .xlsx file.' }
  }

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.xlsx')) {
    return { rows: [], error: 'Only .xlsx files are supported for unit import.' }
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return { rows: [], error: 'The workbook has no sheets.' }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  })

  if (matrix.length === 0) {
    return { rows: [], error: 'The sheet is empty.' }
  }

  const headers = parseHeaderRow(matrix[0] ?? [])
  const headerError = validateImportHeaders(headers)
  if (headerError) {
    return { rows: [], error: headerError }
  }

  if (matrix.length - 1 > MAX_UNIT_IMPORT_ROWS) {
    return { rows: [], error: `Too many rows. Maximum allowed is ${MAX_UNIT_IMPORT_ROWS}.` }
  }

  const buildingNameIdx = headers.indexOf('building_name')
  const unitNumberIdx = headers.indexOf('unit_number')
  const parsedRows: UnitImportRow[] = []

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? []
    const building_name = String(row[buildingNameIdx] ?? '').trim()
    const unit_number = String(row[unitNumberIdx] ?? '').trim()
    const hasAnyValue = building_name.length > 0 || unit_number.length > 0
    if (!hasAnyValue) continue

    parsedRows.push({
      rowNumber: i + 1,
      building_name,
      unit_number,
    })
  }

  return { rows: parsedRows, error: null }
}

function analyzeUnitRows(args: {
  parsedRows: UnitImportRow[]
  buildingNameToId: Map<string, string>
  ambiguousBuildingNames: Set<string>
  existingUnitKeys: Set<string>
}): UnitImportAnalysis {
  const { parsedRows, buildingNameToId, ambiguousBuildingNames, existingUnitKeys } = args
  const seenInFile = new Set<string>()
  const results: UnitImportRowResult[] = []
  const validRows: Array<{ building_id: string; unit_number: string }> = []

  for (const row of parsedRows) {
    let error: string | null = null
    const normalizedBuildingName = normalizeBuildingName(row.building_name)
    const normalizedUnitNumber = normalizeUnitNumber(row.unit_number)

    if (!row.building_name) {
      error = 'Building name is required.'
    } else if (!row.unit_number) {
      error = 'Unit number is required.'
    } else if (ambiguousBuildingNames.has(normalizedBuildingName)) {
      error = 'Building name is ambiguous (multiple matches).'
    }

    const building_id = error ? null : buildingNameToId.get(normalizedBuildingName) ?? null
    if (!error && !building_id) {
      error = 'Building not found.'
    }

    const fileKey = building_id ? `${building_id}::${normalizedUnitNumber}` : null
    if (!error && fileKey && seenInFile.has(fileKey)) {
      error = 'Duplicate unit in file for this building.'
    }

    if (!error && fileKey && existingUnitKeys.has(fileKey)) {
      error = 'Unit already exists for this building.'
    }

    results.push({
      rowNumber: row.rowNumber,
      building_name: row.building_name,
      unit_number: row.unit_number,
      status: error ? 'invalid' : 'valid',
      error,
    })

    if (!error && building_id && normalizedUnitNumber) {
      seenInFile.add(`${building_id}::${normalizedUnitNumber}`)
      validRows.push({ building_id, unit_number: row.unit_number.trim() })
    }
  }

  return {
    rows: results,
    validRows,
    totalRows: results.length,
    validCount: validRows.length,
    invalidCount: results.length - validRows.length,
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  let query = supabase
    .from('units')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)

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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (buildingError || !building) {
    return { data: null, error: 'Building not found or does not belong to this organization' }
  }

  const normalizedNewUnitNumber = normalizeUnitNumber(formData.unit_number)
  const { data: existingUnits, error: duplicateCheckError } = await supabase
    .from('units')
    .select('unit_number')
    .eq('organization_id', orgRes.data.organizationId)
    .eq('building_id', formData.building_id)

  if (duplicateCheckError) {
    console.error('Error checking unit duplicates:', duplicateCheckError)
    return { data: null, error: 'Failed to validate unit number' }
  }

  const duplicateExists = (existingUnits ?? []).some(
    (u) => normalizeUnitNumber(u.unit_number) === normalizedNewUnitNumber
  )
  if (duplicateExists) {
    return { data: null, error: 'A unit with this number already exists in the selected building' }
  }

  const { data: unit, error } = await supabase
    .from('units')
    .insert({
      organization_id: orgRes.data.organizationId,
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
 * Validate uploaded .xlsx file for bulk unit import (no writes).
 */
export async function validateUnitsImport(
  orgSlug: string,
  file: File
): Promise<{ data: UnitImportAnalysis | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  const parsed = await parseUnitsWorkbook(file)
  if (parsed.error) {
    return { data: null, error: parsed.error }
  }

  if (parsed.rows.length === 0) {
    return { data: null, error: 'No data rows found in the uploaded sheet.' }
  }

  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('organization_id', orgRes.data.organizationId)

  if (buildingsError) {
    console.error('Error fetching buildings for unit import:', buildingsError)
    return { data: null, error: 'Failed to validate unit import' }
  }

  const buildingNameToId = new Map<string, string>()
  const nameCounts = new Map<string, number>()
  for (const b of buildings ?? []) {
    const n = normalizeBuildingName(b.name)
    nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1)
    if (!buildingNameToId.has(n)) buildingNameToId.set(n, b.id)
  }
  const ambiguousBuildingNames = new Set(
    Array.from(nameCounts.entries())
      .filter(([, c]) => c > 1)
      .map(([n]) => n)
  )

  const { data: existingUnits, error: unitsError } = await supabase
    .from('units')
    .select('building_id, unit_number')
    .eq('organization_id', orgRes.data.organizationId)

  if (unitsError) {
    console.error('Error fetching existing units for import:', unitsError)
    return { data: null, error: 'Failed to validate unit import' }
  }

  const existingUnitKeys = new Set<string>()
  for (const u of existingUnits ?? []) {
    existingUnitKeys.add(`${u.building_id}::${normalizeUnitNumber(u.unit_number)}`)
  }

  const analysis = analyzeUnitRows({
    parsedRows: parsed.rows,
    buildingNameToId,
    ambiguousBuildingNames,
    existingUnitKeys,
  })

  return { data: analysis, error: null }
}

/**
 * Import units from .xlsx file after validation.
 * Writes only when every row is valid.
 */
export async function importUnitsFromXlsx(
  orgSlug: string,
  file: File
): Promise<{
  data: {
    insertedCount: number
    totalRows: number
    rows: UnitImportRowResult[]
  } | null
  error: string | null
}> {
  const validation = await validateUnitsImport(orgSlug, file)
  if (validation.error || !validation.data) {
    return { data: null, error: validation.error ?? 'Failed to validate unit import' }
  }

  if (validation.data.invalidCount > 0) {
    return {
      data: {
        insertedCount: 0,
        totalRows: validation.data.totalRows,
        rows: validation.data.rows,
      },
      error: 'Import contains invalid rows. Resolve the errors and retry.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  const payload = validation.data.validRows.map((row) => ({
    organization_id: orgRes.data.organizationId,
    building_id: row.building_id,
    unit_number: row.unit_number,
  }))

  const { error: insertError } = await supabase.from('units').insert(payload)
  if (insertError) {
    console.error('Error bulk inserting units:', insertError)
    return { data: null, error: 'Failed to import units' }
  }

  return {
    data: {
      insertedCount: payload.length,
      totalRows: validation.data.totalRows,
      rows: validation.data.rows,
    },
    error: null,
  }
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
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
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (unitError || !existingUnit) {
    return { data: null, error: 'Unit not found or access denied' }
  }

  // Verify new building belongs to the same org
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', formData.building_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (buildingError || !building) {
    return { data: null, error: 'Building not found or does not belong to this organization' }
  }

  const normalizedNewUnitNumber = normalizeUnitNumber(formData.unit_number)
  const { data: siblingUnits, error: duplicateCheckError } = await supabase
    .from('units')
    .select('id, unit_number')
    .eq('organization_id', orgRes.data.organizationId)
    .eq('building_id', formData.building_id)
    .neq('id', unitId)

  if (duplicateCheckError) {
    console.error('Error checking unit duplicates:', duplicateCheckError)
    return { data: null, error: 'Failed to validate unit number' }
  }

  const duplicateExists = (siblingUnits ?? []).some(
    (u) => normalizeUnitNumber(u.unit_number) === normalizedNewUnitNumber
  )
  if (duplicateExists) {
    return { data: null, error: 'A unit with this number already exists in the selected building' }
  }

  const { data: unit, error } = await supabase
    .from('units')
    .update({
      building_id: formData.building_id,
      unit_number: formData.unit_number.trim(),
    })
    .eq('id', unitId)
    .eq('organization_id', orgRes.data.organizationId)
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { error: orgRes.error }

  // Validate role: Only OWNER can delete
  if (orgRes.data.role !== 'OWNER') {
    return { error: 'Only organization owners can delete units' }
  }

  // Verify unit belongs to org
  const { data: existingUnit, error: unitError } = await supabase
    .from('units')
    .select('id, organization_id')
    .eq('id', unitId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (unitError || !existingUnit) {
    return { error: 'Unit not found or access denied' }
  }

  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', unitId)
    .eq('organization_id', orgRes.data.organizationId)

  if (error) {
    console.error('Error deleting unit:', error)
    return { error: 'Failed to delete unit' }
  }

  return { error: null }
}

