'use server'

import { createClient } from '@/lib/supabase/server'

export type AuditActionType =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_UPDATED'
  | 'PAYMENT_DELETED'
  | 'RENT_PERIOD_STATUS_CHANGED'
  | 'ORGANIZATION_CURRENCY_UPDATED'
  | 'MEMBERSHIP_ROLE_CHANGED'
  | 'MEMBERSHIP_CREATED'
  | 'MEMBERSHIP_DELETED'

export type AuditEntityType = 'payment' | 'rent_period' | 'organization' | 'membership'

export type AuditLogMetadata = {
  before?: Record<string, any>
  after?: Record<string, any>
  [key: string]: any
}

/**
 * Create an audit log entry
 * This function should be called from server actions after sensitive operations.
 * It captures who, what, when, and before/after values.
 */
export async function createAuditLog(
  organizationId: string,
  userId: string,
  actionType: AuditActionType,
  entityType: AuditEntityType,
  description: string,
  options?: {
    entityId?: string
    metadata?: AuditLogMetadata
    ipAddress?: string
    userAgent?: string
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: options?.entityId || null,
      description,
      metadata: options?.metadata || null,
      ip_address: options?.ipAddress || null,
      user_agent: options?.userAgent || null,
    })

  if (error) {
    console.error('Error creating audit log:', error)
    // Don't fail the main operation if audit logging fails
    // Log to console for debugging but return success
    return { error: null }
  }

  return { error: null }
}

/**
 * List audit logs for an organization
 */
export async function listAuditLogs(
  orgSlug: string,
  filters?: {
    actionType?: AuditActionType
    entityType?: AuditEntityType
    entityId?: string
    limit?: number
  }
): Promise<{
  data: Array<{
    id: string
    organization_id: string
    user_id: string | null
    action_type: AuditActionType
    entity_type: AuditEntityType
    entity_id: string | null
    description: string
    metadata: AuditLogMetadata | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
  }> | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: 'Not authenticated' }
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    return { data: null, error: 'Organization not found or access denied' }
  }

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', org.id)
    .single()

  if (membershipError || !membership) {
    return { data: null, error: 'Organization not found or access denied' }
  }

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  if (filters?.actionType) {
    query = query.eq('action_type', filters.actionType)
  }

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  } else {
    query = query.limit(100) // Default limit
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching audit logs:', error)
    return { data: null, error: 'Failed to fetch audit logs' }
  }

  return { data: data as any, error: null }
}

