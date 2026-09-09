'use server'

import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/app/actions/audit-logs'
import { getOrgContextForUser } from './_org-context'

export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'APPLIANCE' | 'STRUCTURAL' | 'SECURITY' | 'OTHER'
export type MaintenancePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY'
export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'

export type MaintenanceRequest = {
  id: string
  organization_id: string
  tenant_id: string
  occupancy_id: string
  created_by_user_id: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  title: string
  description: string
  status: MaintenanceStatus
  resolved_at: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES: MaintenanceCategory[] = ['PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'OTHER']
const PRIORITIES: MaintenancePriority[] = ['LOW', 'NORMAL', 'HIGH', 'EMERGENCY']
const STATUSES: MaintenanceStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']
const STAFF_ROLES = ['OWNER', 'MANAGER', 'OPS']

export async function listMaintenanceRequests(orgSlug: string): Promise<{ data: MaintenanceRequest[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching maintenance requests:', error)
    return { data: null, error: 'Failed to fetch maintenance requests' }
  }
  return { data: data as MaintenanceRequest[], error: null }
}

export async function createMaintenanceRequest(
  orgSlug: string,
  input: {
    tenant_id: string
    occupancy_id: string
    category: MaintenanceCategory
    priority: MaintenancePriority
    title: string
    description: string
  }
): Promise<{ data: MaintenanceRequest | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }
  if (!STAFF_ROLES.includes(orgRes.data.role)) return { data: null, error: 'Insufficient permissions' }

  const title = input.title.trim()
  const description = input.description.trim()
  if (!title) return { data: null, error: 'Request title is required' }
  if (!description) return { data: null, error: 'Description is required' }
  if (!CATEGORIES.includes(input.category)) return { data: null, error: 'Invalid service category' }
  if (!PRIORITIES.includes(input.priority)) return { data: null, error: 'Invalid priority' }

  const { data: occupancy, error: occupancyError } = await supabase
    .from('occupancies')
    .select('id, tenant_id, active_from, active_to')
    .eq('id', input.occupancy_id)
    .eq('tenant_id', input.tenant_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()
  if (occupancyError || !occupancy) {
    return { data: null, error: 'The selected tenant is not assigned to this occupancy' }
  }
  const today = new Date().toISOString().slice(0, 10)
  if (occupancy.active_from > today || (occupancy.active_to && occupancy.active_to < today)) {
    return { data: null, error: 'Maintenance requests can only be created for an active occupancy' }
  }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert({
      organization_id: orgRes.data.organizationId,
      tenant_id: input.tenant_id,
      occupancy_id: input.occupancy_id,
      created_by_user_id: user.id,
      category: input.category,
      priority: input.priority,
      title,
      description,
    })
    .select()
    .single()
  if (error || !data) {
    console.error('Error creating maintenance request:', error)
    return { data: null, error: 'Failed to create maintenance request' }
  }

  await createAuditLog(orgRes.data.organizationId, user.id, 'MAINTENANCE_REQUEST_CREATED', 'maintenance_request', `Maintenance request created: ${title}`, { entityId: data.id })
  return { data: data as MaintenanceRequest, error: null }
}

export async function updateMaintenanceRequestStatus(
  orgSlug: string,
  requestId: string,
  status: MaintenanceStatus
): Promise<{ data: MaintenanceRequest | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }
  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }
  if (!STAFF_ROLES.includes(orgRes.data.role)) return { data: null, error: 'Insufficient permissions' }
  if (!STATUSES.includes(status)) return { data: null, error: 'Invalid request status' }

  const { data: existing, error: existingError } = await supabase
    .from('maintenance_requests')
    .select('id, status, title')
    .eq('id', requestId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()
  if (existingError || !existing) return { data: null, error: 'Maintenance request not found' }

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ status, resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : null })
    .eq('id', requestId)
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()
  if (error || !data) return { data: null, error: 'Failed to update maintenance request' }

  await createAuditLog(orgRes.data.organizationId, user.id, 'MAINTENANCE_REQUEST_STATUS_CHANGED', 'maintenance_request', `Maintenance request status changed from ${existing.status} to ${status}`, {
    entityId: requestId,
    metadata: { before: { status: existing.status }, after: { status } },
  })
  return { data: data as MaintenanceRequest, error: null }
}

export async function deleteMaintenanceRequest(orgSlug: string, requestId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { error: orgRes.error }
  if (orgRes.data.role !== 'OWNER') return { error: 'Only organization owners can delete maintenance requests' }

  const { data: existing, error: existingError } = await supabase
    .from('maintenance_requests')
    .select('id, title')
    .eq('id', requestId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()
  if (existingError || !existing) return { error: 'Maintenance request not found' }

  const { error } = await supabase.from('maintenance_requests').delete().eq('id', requestId).eq('organization_id', orgRes.data.organizationId)
  if (error) return { error: 'Failed to delete maintenance request' }
  await createAuditLog(orgRes.data.organizationId, user.id, 'MAINTENANCE_REQUEST_DELETED', 'maintenance_request', `Maintenance request deleted: ${existing.title}`, { entityId: requestId })
  return { error: null }
}
