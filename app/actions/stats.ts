'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'

export type OrgStats = {
  buildings: number
  units: number
  tenants: number
  occupancies: number
  rentConfigs: number
  rentPeriods: number
  overduePeriods: number
}

/**
 * Get organization statistics (counts for all entities)
 */
export async function getOrgStats(orgSlug: string): Promise<{
  data: OrgStats | null
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
  if (orgRes.error || !orgRes.data) {
    return { data: null, error: orgRes.error }
  }

  const { organizationId } = orgRes.data

  // Fetch all counts in parallel
  const [
    { count: buildingsCount },
    { count: unitsCount },
    { count: tenantsCount },
    { count: occupanciesCount },
    { count: rentConfigsCount },
    { count: rentPeriodsCount },
    { count: overduePeriodsCount },
  ] = await Promise.all([
    supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('occupancies').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('rent_configs').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('rent_periods').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('rent_periods')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'OVERDUE'),
  ])

  return {
    data: {
      buildings: buildingsCount ?? 0,
      units: unitsCount ?? 0,
      tenants: tenantsCount ?? 0,
      occupancies: occupanciesCount ?? 0,
      rentConfigs: rentConfigsCount ?? 0,
      rentPeriods: rentPeriodsCount ?? 0,
      overduePeriods: overduePeriodsCount ?? 0,
    },
    error: null,
  }
}

