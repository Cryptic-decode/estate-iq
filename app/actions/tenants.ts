'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'
import * as XLSX from 'xlsx'

type Tenant = {
  id: string
  organization_id: string
  full_name: string
  email: string | null
  phone: string | null
  guarantor_full_name: string | null
  guarantor_email: string | null
  guarantor_phone: string | null
  created_at: string
  updated_at: string
}

type TenantFormData = {
  full_name: string
  email?: string
  phone?: string
  guarantor_full_name?: string
  guarantor_email?: string
  guarantor_phone?: string
}

type TenantImportRow = {
  rowNumber: number
  full_name: string
  email: string
  phone: string
  guarantor_full_name: string
  guarantor_email: string
  guarantor_phone: string
}

type TenantImportRowResult = {
  rowNumber: number
  full_name: string
  status: 'valid' | 'invalid'
  error: string | null
}

type TenantImportAnalysis = {
  rows: TenantImportRowResult[]
  validRows: TenantImportRow[]
  totalRows: number
  validCount: number
  invalidCount: number
}

const TENANT_IMPORT_HEADERS = [
  'full_name',
  'email',
  'phone',
  'guarantor_full_name',
  'guarantor_email',
  'guarantor_phone',
] as const
const MAX_TENANT_IMPORT_ROWS = 2000

function parseHeaderRow(headerRow: unknown[]): string[] {
  return headerRow.map((cell) => String(cell ?? '').trim().toLowerCase())
}

function validateImportHeaders(headers: string[]): string | null {
  const missingHeaders = TENANT_IMPORT_HEADERS.filter((h) => !headers.includes(h))
  if (missingHeaders.length > 0) {
    return `Missing required header(s): ${missingHeaders.join(', ')}`
  }

  const extraHeaders = headers.filter(
    (h) =>
      h.length > 0 &&
      !TENANT_IMPORT_HEADERS.includes(h as (typeof TENANT_IMPORT_HEADERS)[number])
  )
  if (extraHeaders.length > 0) {
    return `Unexpected header(s): ${extraHeaders.join(', ')}`
  }

  return null
}

async function parseTenantWorkbook(file: File): Promise<{ rows: TenantImportRow[]; error: string | null }> {
  if (!file || file.size === 0) {
    return { rows: [], error: 'Please upload a non-empty .xlsx file.' }
  }

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.xlsx')) {
    return { rows: [], error: 'Only .xlsx files are supported for tenant import.' }
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

  if (matrix.length - 1 > MAX_TENANT_IMPORT_ROWS) {
    return { rows: [], error: `Too many rows. Maximum allowed is ${MAX_TENANT_IMPORT_ROWS}.` }
  }

  const idx = {
    full_name: headers.indexOf('full_name'),
    email: headers.indexOf('email'),
    phone: headers.indexOf('phone'),
    guarantor_full_name: headers.indexOf('guarantor_full_name'),
    guarantor_email: headers.indexOf('guarantor_email'),
    guarantor_phone: headers.indexOf('guarantor_phone'),
  }

  const parsedRows: TenantImportRow[] = []

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? []
    const parsed: TenantImportRow = {
      rowNumber: i + 1,
      full_name: String(row[idx.full_name] ?? '').trim(),
      email: String(row[idx.email] ?? '').trim(),
      phone: String(row[idx.phone] ?? '').trim(),
      guarantor_full_name: String(row[idx.guarantor_full_name] ?? '').trim(),
      guarantor_email: String(row[idx.guarantor_email] ?? '').trim(),
      guarantor_phone: String(row[idx.guarantor_phone] ?? '').trim(),
    }

    const hasAnyValue = Object.entries(parsed)
      .filter(([k]) => k !== 'rowNumber')
      .some(([, v]) => String(v).length > 0)

    if (!hasAnyValue) continue
    parsedRows.push(parsed)
  }

  return { rows: parsedRows, error: null }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function analyzeTenantRows(parsedRows: TenantImportRow[]): TenantImportAnalysis {
  const rows: TenantImportRowResult[] = []
  const validRows: TenantImportRow[] = []

  for (const row of parsedRows) {
    let error: string | null = null

    if (!row.full_name) {
      error = 'Full name is required.'
    } else if (row.email && !isValidEmail(row.email)) {
      error = 'Email is invalid.'
    } else if (row.guarantor_email && !isValidEmail(row.guarantor_email)) {
      error = 'Guarantor email is invalid.'
    } else if (
      (row.guarantor_email || row.guarantor_phone) &&
      !row.guarantor_full_name
    ) {
      error = 'Guarantor full name is required when guarantor contact is provided.'
    }

    rows.push({
      rowNumber: row.rowNumber,
      full_name: row.full_name,
      status: error ? 'invalid' : 'valid',
      error,
    })

    if (!error) validRows.push(row)
  }

  return {
    rows,
    validRows,
    totalRows: rows.length,
    validCount: validRows.length,
    invalidCount: rows.length - validRows.length,
  }
}

/**
 * List all tenants for an organization
 */
export async function listTenants(orgSlug: string): Promise<{
  data: Tenant[] | null
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

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching tenants:', error)
    return { data: null, error: 'Failed to fetch tenants' }
  }

  return { data: tenants as Tenant[], error: null }
}

/**
 * Create a new tenant
 */
export async function createTenant(
  orgSlug: string,
  formData: TenantFormData
): Promise<{ data: Tenant | null; error: string | null }> {
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
  if (!formData.full_name || formData.full_name.trim().length === 0) {
    return { data: null, error: 'Full name is required' }
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      organization_id: orgRes.data.organizationId,
      full_name: formData.full_name.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      guarantor_full_name: formData.guarantor_full_name?.trim() || null,
      guarantor_email: formData.guarantor_email?.trim() || null,
      guarantor_phone: formData.guarantor_phone?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    return { data: null, error: 'Failed to create tenant' }
  }

  return { data: tenant as Tenant, error: null }
}

/**
 * Update a tenant
 */
export async function updateTenant(
  orgSlug: string,
  tenantId: string,
  formData: TenantFormData
): Promise<{ data: Tenant | null; error: string | null }> {
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
  if (!formData.full_name || formData.full_name.trim().length === 0) {
    return { data: null, error: 'Full name is required' }
  }

  // Verify tenant belongs to org (RLS will also enforce this, but we validate explicitly)
  const { data: existingTenant, error: fetchError } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('id', tenantId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (fetchError || !existingTenant) {
    return { data: null, error: 'Tenant not found or access denied' }
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({
      full_name: formData.full_name.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      guarantor_full_name: formData.guarantor_full_name?.trim() || null,
      guarantor_email: formData.guarantor_email?.trim() || null,
      guarantor_phone: formData.guarantor_phone?.trim() || null,
    })
    .eq('id', tenantId)
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    return { data: null, error: 'Failed to update tenant' }
  }

  return { data: tenant as Tenant, error: null }
}

/**
 * Delete a tenant (OWNER only)
 */
export async function deleteTenant(
  orgSlug: string,
  tenantId: string
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
    return { error: 'Only organization owners can delete tenants' }
  }

  // Verify tenant belongs to org
  const { data: existingTenant, error: fetchError } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('id', tenantId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (fetchError || !existingTenant) {
    return { error: 'Tenant not found or access denied' }
  }

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .eq('organization_id', orgRes.data.organizationId)

  if (error) {
    console.error('Error deleting tenant:', error)
    return { error: 'Failed to delete tenant' }
  }

  return { error: null }
}

/**
 * Validate uploaded .xlsx file for bulk tenant import (no writes).
 */
export async function validateTenantImport(
  orgSlug: string,
  file: File
): Promise<{ data: TenantImportAnalysis | null; error: string | null }> {
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

  const parsed = await parseTenantWorkbook(file)
  if (parsed.error) {
    return { data: null, error: parsed.error }
  }

  const analysis = analyzeTenantRows(parsed.rows)
  if (analysis.totalRows === 0) {
    return { data: null, error: 'No data rows found in the uploaded sheet.' }
  }

  return { data: analysis, error: null }
}

/**
 * Import tenants from .xlsx file after validation.
 * Writes only when every row is valid.
 */
export async function importTenantsFromXlsx(
  orgSlug: string,
  file: File
): Promise<{
  data: {
    insertedCount: number
    totalRows: number
    rows: TenantImportRowResult[]
  } | null
  error: string | null
}> {
  const validation = await validateTenantImport(orgSlug, file)
  if (validation.error || !validation.data) {
    return { data: null, error: validation.error ?? 'Failed to validate tenant import' }
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

  const organizationId = orgRes.data.organizationId

  const payload = validation.data.validRows.map((row) => ({
    organization_id: organizationId,
    full_name: row.full_name,
    email: row.email || null,
    phone: row.phone || null,
    guarantor_full_name: row.guarantor_full_name || null,
    guarantor_email: row.guarantor_email || null,
    guarantor_phone: row.guarantor_phone || null,
  }))

  const { error: insertError } = await supabase.from('tenants').insert(payload)
  if (insertError) {
    console.error('Error bulk inserting tenants:', insertError)
    return { data: null, error: 'Failed to import tenants' }
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
