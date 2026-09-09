'use server'

import type { SupabaseClient } from '@supabase/supabase-js'

export type OrgContext = {
  organizationId: string
  role: string
}

export async function getOrgContextForUser(
  supabase: SupabaseClient,
  userId: string,
  orgSlug: string
): Promise<{ data: OrgContext | null; error: string | null }> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single()

  if (orgError || !org) {
    return { data: null, error: 'Organization not found or access denied' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', org.id)
    .single()

  if (membershipError || !membership) {
    return { data: null, error: 'Organization not found or access denied' }
  }

  return {
    data: {
      organizationId: org.id as string,
      role: String(membership.role),
    },
    error: null,
  }
}

