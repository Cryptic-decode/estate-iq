'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserMemberships } from './organizations'

type Tenant = {
  id: string
  organization_id: string
  full_name: string
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

type TenantFormData = {
  full_name: string
  email?: string
  phone?: string
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

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('organization_id', orgResult.organizationId)
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

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgResult.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.full_name || formData.full_name.trim().length === 0) {
    return { data: null, error: 'Full name is required' }
  }

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      organization_id: orgResult.organizationId,
      full_name: formData.full_name.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
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

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { data: null, error: orgResult.error }
  }

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgResult.role)) {
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
    .eq('organization_id', orgResult.organizationId)
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
    })
    .eq('id', tenantId)
    .eq('organization_id', orgResult.organizationId)
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

  const orgResult = await getOrgFromSlug(orgSlug)
  if ('error' in orgResult) {
    return { error: orgResult.error }
  }

  // Validate role: Only OWNER can delete
  if (orgResult.role !== 'OWNER') {
    return { error: 'Only organization owners can delete tenants' }
  }

  // Verify tenant belongs to org
  const { data: existingTenant, error: fetchError } = await supabase
    .from('tenants')
    .select('id, organization_id')
    .eq('id', tenantId)
    .eq('organization_id', orgResult.organizationId)
    .single()

  if (fetchError || !existingTenant) {
    return { error: 'Tenant not found or access denied' }
  }

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .eq('organization_id', orgResult.organizationId)

  if (error) {
    console.error('Error deleting tenant:', error)
    return { error: 'Failed to delete tenant' }
  }

  return { error: null }
}

