'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'
import * as XLSX from 'xlsx'

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
  address: string
}

type BuildingImportRow = {
  rowNumber: number
  name: string
  address: string
}

type BuildingImportRowResult = {
  rowNumber: number
  name: string
  address: string
  status: 'valid' | 'invalid'
  error: string | null
}

type BuildingImportAnalysis = {
  rows: BuildingImportRowResult[]
  validRows: BuildingImportRow[]
  totalRows: number
  validCount: number
  invalidCount: number
}

const BUILDING_IMPORT_HEADERS = ['name', 'address'] as const
const MAX_BUILDING_IMPORT_ROWS = 2000

function normalizeBuildingName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseHeaderRow(headerRow: unknown[]): string[] {
  return headerRow.map((cell) => String(cell ?? '').trim().toLowerCase())
}

function validateImportHeaders(headers: string[]): string | null {
  const missingHeaders = BUILDING_IMPORT_HEADERS.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return `Missing required header(s): ${missingHeaders.join(', ')}`
  }

  const extraHeaders = headers.filter((h) => h.length > 0 && !BUILDING_IMPORT_HEADERS.includes(h as (typeof BUILDING_IMPORT_HEADERS)[number]))
  if (extraHeaders.length > 0) {
    return `Unexpected header(s): ${extraHeaders.join(', ')}`
  }

  return null
}

async function parseBuildingWorkbook(file: File): Promise<{ rows: BuildingImportRow[]; error: string | null }> {
  if (!file || file.size === 0) {
    return { rows: [], error: 'Please upload a non-empty .xlsx file.' }
  }

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.xlsx')) {
    return { rows: [], error: 'Only .xlsx files are supported for building import.' }
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

  if (matrix.length - 1 > MAX_BUILDING_IMPORT_ROWS) {
    return {
      rows: [],
      error: `Too many rows. Maximum allowed is ${MAX_BUILDING_IMPORT_ROWS}.`,
    }
  }

  const nameIdx = headers.indexOf('name')
  const addressIdx = headers.indexOf('address')
  const parsedRows: BuildingImportRow[] = []

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? []
    const name = String(row[nameIdx] ?? '').trim()
    const address = String(row[addressIdx] ?? '').trim()
    const hasAnyValue = name.length > 0 || address.length > 0

    if (!hasAnyValue) {
      continue
    }

    parsedRows.push({
      rowNumber: i + 1,
      name,
      address,
    })
  }

  return { rows: parsedRows, error: null }
}

function analyzeBuildingRows(parsedRows: BuildingImportRow[], existingNames: Set<string>): BuildingImportAnalysis {
  const seenInFile = new Set<string>()
  const rowResults: BuildingImportRowResult[] = []
  const validRows: BuildingImportRow[] = []

  for (const row of parsedRows) {
    let error: string | null = null
    const normalizedName = normalizeBuildingName(row.name)

    if (!row.name) {
      error = 'Building name is required.'
    } else if (!row.address) {
      error = 'Address is required.'
    } else if (seenInFile.has(normalizedName)) {
      error = 'Duplicate building name in file.'
    } else if (existingNames.has(normalizedName)) {
      error = 'Building name already exists in this organization.'
    }

    if (error) {
      rowResults.push({
        rowNumber: row.rowNumber,
        name: row.name,
        address: row.address,
        status: 'invalid',
        error,
      })
      continue
    }

    seenInFile.add(normalizedName)
    validRows.push(row)
    rowResults.push({
      rowNumber: row.rowNumber,
      name: row.name,
      address: row.address,
      status: 'valid',
      error: null,
    })
  }

  return {
    rows: rowResults,
    validRows,
    totalRows: rowResults.length,
    validCount: validRows.length,
    invalidCount: rowResults.length - validRows.length,
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.name || formData.name.trim().length === 0) {
    return { data: null, error: 'Building name is required' }
  }
  if (!formData.address || formData.address.trim().length === 0) {
    return { data: null, error: 'Address is required' }
  }

  const trimmedName = formData.name.trim()
  const normalizedName = normalizeBuildingName(trimmedName)
  const { data: existingBuildings, error: duplicateCheckError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('organization_id', orgRes.data.organizationId)

  if (duplicateCheckError) {
    console.error('Error checking building duplicates:', duplicateCheckError)
    return { data: null, error: 'Failed to validate building name' }
  }

  const duplicateExists = (existingBuildings ?? []).some(
    (b) => normalizeBuildingName(b.name) === normalizedName
  )
  if (duplicateExists) {
    return { data: null, error: 'A building with this name already exists' }
  }

  const { data: building, error } = await supabase
    .from('buildings')
    .insert({
      organization_id: orgRes.data.organizationId,
      name: trimmedName,
      address: formData.address.trim(),
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.name || formData.name.trim().length === 0) {
    return { data: null, error: 'Building name is required' }
  }
  if (!formData.address || formData.address.trim().length === 0) {
    return { data: null, error: 'Address is required' }
  }

  const trimmedName = formData.name.trim()
  const normalizedName = normalizeBuildingName(trimmedName)

  // Verify building belongs to org (RLS will also enforce this, but we validate explicitly)
  const { data: existingBuilding, error: fetchError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', buildingId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (fetchError || !existingBuilding) {
    return { data: null, error: 'Building not found or access denied' }
  }

  const { data: duplicateCandidates, error: duplicateCheckError } = await supabase
    .from('buildings')
    .select('id, name')
    .eq('organization_id', orgRes.data.organizationId)
    .neq('id', buildingId)

  if (duplicateCheckError) {
    console.error('Error checking building duplicates:', duplicateCheckError)
    return { data: null, error: 'Failed to validate building name' }
  }

  const duplicateExists = (duplicateCandidates ?? []).some(
    (b) => normalizeBuildingName(b.name) === normalizedName
  )
  if (duplicateExists) {
    return { data: null, error: 'A building with this name already exists' }
  }

  const { data: building, error } = await supabase
    .from('buildings')
    .update({
      name: trimmedName,
      address: formData.address.trim(),
    })
    .eq('id', buildingId)
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating building:', error)
    return { data: null, error: 'Failed to update building' }
  }

  return { data: building as Building, error: null }
}

/**
 * Validate uploaded .xlsx file for bulk building import (no writes).
 */
export async function previewBuildingImport(
  orgSlug: string,
  file: File
): Promise<{ data: BuildingImportAnalysis | null; error: string | null }> {
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

  const parsed = await parseBuildingWorkbook(file)
  if (parsed.error) {
    return { data: null, error: parsed.error }
  }

  const { data: existingBuildings, error: existingBuildingsError } = await supabase
    .from('buildings')
    .select('name')
    .eq('organization_id', orgRes.data.organizationId)

  if (existingBuildingsError) {
    console.error('Error fetching existing buildings for import preview:', existingBuildingsError)
    return { data: null, error: 'Failed to validate building import' }
  }

  const existingNames = new Set(
    (existingBuildings ?? []).map((b) => normalizeBuildingName(b.name))
  )
  const analysis = analyzeBuildingRows(parsed.rows, existingNames)

  if (analysis.totalRows === 0) {
    return { data: null, error: 'No data rows found in the uploaded sheet.' }
  }

  return { data: analysis, error: null }
}

/**
 * Import buildings from .xlsx file after validation.
 * Writes only when every row is valid.
 */
export async function importBuildingsFromXlsx(
  orgSlug: string,
  file: File
): Promise<{
  data: {
    insertedCount: number
    totalRows: number
    rows: BuildingImportRowResult[]
  } | null
  error: string | null
}> {
  const preview = await previewBuildingImport(orgSlug, file)
  if (preview.error || !preview.data) {
    return { data: null, error: preview.error ?? 'Failed to preview building import' }
  }

  if (preview.data.invalidCount > 0) {
    return {
      data: {
        insertedCount: 0,
        totalRows: preview.data.totalRows,
        rows: preview.data.rows,
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

  const insertPayload = preview.data.validRows.map((row) => ({
    organization_id: orgRes.data.organizationId,
    name: row.name,
    address: row.address,
  }))

  const { error: insertError } = await supabase.from('buildings').insert(insertPayload)
  if (insertError) {
    console.error('Error bulk inserting buildings:', insertError)
    return { data: null, error: 'Failed to import buildings' }
  }

  return {
    data: {
      insertedCount: insertPayload.length,
      totalRows: preview.data.totalRows,
      rows: preview.data.rows,
    },
    error: null,
  }
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

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { error: orgRes.error }

  // Validate role: Only OWNER can delete
  if (orgRes.data.role !== 'OWNER') {
    return { error: 'Only organization owners can delete buildings' }
  }

  // Verify building belongs to org
  const { data: existingBuilding, error: fetchError } = await supabase
    .from('buildings')
    .select('id, organization_id')
    .eq('id', buildingId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (fetchError || !existingBuilding) {
    return { error: 'Building not found or access denied' }
  }

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', buildingId)
    .eq('organization_id', orgRes.data.organizationId)

  if (error) {
    console.error('Error deleting building:', error)
    return { error: 'Failed to delete building' }
  }

  return { error: null }
}

