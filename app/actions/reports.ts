'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'

export type DelinquencyBucket = {
  label: '0–7' | '8–15' | '16–30' | '31+'
  minDays: number
  maxDays: number | null
  unpaidPeriods: number
  unpaidAmount: number
}

export type DelinquencyAgingReport = {
  buckets: DelinquencyBucket[]
  totals: {
    unpaidPeriods: number
    unpaidAmount: number
    duePeriods: number
    overduePeriods: number
  }
  generatedAt: string
}

export type BuildingRollupRow = {
  building: {
    id: string
    name: string
    address: string | null
  }
  unpaidPeriods: number
  overduePeriods: number
  duePeriods: number
  unpaidAmount: number
}

export type BuildingRollupsReport = {
  rows: BuildingRollupRow[]
  totals: {
    buildingsWithUnpaid: number
    unpaidPeriods: number
    overduePeriods: number
    duePeriods: number
    unpaidAmount: number
  }
  generatedAt: string
}

type RentPeriodRow = {
  id: string
  status: 'DUE' | 'OVERDUE' | 'PAID'
  days_overdue: number | null
  rent_config: { amount: number } | null
}

export async function getDelinquencyAging(orgSlug: string): Promise<{
  data: DelinquencyAgingReport | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  const { data: rentPeriods, error } = await supabase
    .from('rent_periods')
    .select(
      `
      id,
      status,
      days_overdue,
      rent_configs!inner(amount)
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .in('status', ['DUE', 'OVERDUE'])

  if (error) return { data: null, error: error.message }

  const rows: RentPeriodRow[] =
    (rentPeriods as any[] | null)?.map((rp) => ({
      id: String(rp.id),
      status: rp.status as RentPeriodRow['status'],
      days_overdue: typeof rp.days_overdue === 'number' ? rp.days_overdue : null,
      rent_config: rp.rent_configs ? { amount: Number(rp.rent_configs.amount) } : null,
    })) ?? []

  const buckets: DelinquencyBucket[] = [
    { label: '0–7', minDays: 0, maxDays: 7, unpaidPeriods: 0, unpaidAmount: 0 },
    { label: '8–15', minDays: 8, maxDays: 15, unpaidPeriods: 0, unpaidAmount: 0 },
    { label: '16–30', minDays: 16, maxDays: 30, unpaidPeriods: 0, unpaidAmount: 0 },
    { label: '31+', minDays: 31, maxDays: null, unpaidPeriods: 0, unpaidAmount: 0 },
  ]

  let duePeriods = 0
  let overduePeriods = 0
  let totalUnpaidAmount = 0

  for (const rp of rows) {
    const amount = rp.rent_config?.amount ?? 0
    const days = rp.status === 'DUE' ? 0 : Math.max(0, rp.days_overdue ?? 0)

    totalUnpaidAmount += amount
    if (rp.status === 'DUE') duePeriods += 1
    if (rp.status === 'OVERDUE') overduePeriods += 1

    const bucket = buckets.find((b) => {
      if (b.maxDays == null) return days >= b.minDays
      return days >= b.minDays && days <= b.maxDays
    })
    if (!bucket) continue

    bucket.unpaidPeriods += 1
    bucket.unpaidAmount += amount
  }

  const report: DelinquencyAgingReport = {
    buckets,
    totals: {
      unpaidPeriods: rows.length,
      unpaidAmount: totalUnpaidAmount,
      duePeriods,
      overduePeriods,
    },
    generatedAt: new Date().toISOString(),
  }

  return { data: report, error: null }
}

type RollupPeriodRow = {
  status: 'DUE' | 'OVERDUE'
  amount: number
  building: { id: string; name: string; address: string | null }
}

export async function getBuildingRollups(orgSlug: string): Promise<{
  data: BuildingRollupsReport | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  const { data: rentPeriods, error } = await supabase
    .from('rent_periods')
    .select(
      `
      status,
      rent_configs!inner(
        amount,
        occupancies!inner(
          units!inner(
            buildings!inner(
              id,
              name,
              address
            )
          )
        )
      )
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .in('status', ['DUE', 'OVERDUE'])

  if (error) return { data: null, error: error.message }

  const rows: RollupPeriodRow[] =
    (rentPeriods as any[] | null)
      ?.map((rp) => {
        const rc = rp.rent_configs
        const occ = rc?.occupancies
        const unit = occ?.units
        const b = unit?.buildings

        if (!b?.id || !b?.name) return null

        return {
          status: rp.status as 'DUE' | 'OVERDUE',
          amount: Number(rc?.amount ?? 0),
          building: {
            id: String(b.id),
            name: String(b.name),
            address: (b.address ?? null) as string | null,
          },
        } satisfies RollupPeriodRow
      })
      .filter(Boolean) ?? []

  const byBuilding = new Map<string, BuildingRollupRow>()

  for (const r of rows as RollupPeriodRow[]) {
    const existing =
      byBuilding.get(r.building.id) ??
      ({
        building: r.building,
        unpaidPeriods: 0,
        overduePeriods: 0,
        duePeriods: 0,
        unpaidAmount: 0,
      } satisfies BuildingRollupRow)

    existing.unpaidPeriods += 1
    existing.unpaidAmount += r.amount
    if (r.status === 'OVERDUE') existing.overduePeriods += 1
    if (r.status === 'DUE') existing.duePeriods += 1

    byBuilding.set(r.building.id, existing)
  }

  const rollups = Array.from(byBuilding.values()).sort((a, b) => {
    if (b.unpaidAmount !== a.unpaidAmount) return b.unpaidAmount - a.unpaidAmount
    return a.building.name.localeCompare(b.building.name)
  })

  const totals = rollups.reduce(
    (acc, r) => {
      acc.buildingsWithUnpaid += 1
      acc.unpaidPeriods += r.unpaidPeriods
      acc.overduePeriods += r.overduePeriods
      acc.duePeriods += r.duePeriods
      acc.unpaidAmount += r.unpaidAmount
      return acc
    },
    {
      buildingsWithUnpaid: 0,
      unpaidPeriods: 0,
      overduePeriods: 0,
      duePeriods: 0,
      unpaidAmount: 0,
    }
  )

  const report: BuildingRollupsReport = {
    rows: rollups,
    totals,
    generatedAt: new Date().toISOString(),
  }

  return { data: report, error: null }
}

export type CollectionRateMetrics = {
  totalDue: number
  totalCollected: number
  collectionRate: number // percentage (0-100)
  periodCount: number
  paidPeriodCount: number
}

export type CollectionRateReport = {
  metrics: CollectionRateMetrics
  dateRange: {
    startDate: string
    endDate: string
  }
  generatedAt: string
}

/**
 * Calculate collection rate metrics for a date range
 * Collection rate = (Total Collected / Total Due) * 100
 *
 * Total Due: Sum of rent_periods amounts where due_date is in range
 * Total Collected: Sum of payments amounts where paid_at is in range
 *   and the payment's rent_period has due_date in range
 */
export async function getCollectionRate(
  orgSlug: string,
  startDate: string,
  endDate: string
): Promise<{
  data: CollectionRateReport | null
  error: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { data: null, error: 'Not authenticated' }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) return { data: null, error: orgRes.error }

  // Validate date range
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { data: null, error: 'Invalid date range' }
  }

  if (start > end) {
    return { data: null, error: 'Start date must be before end date' }
  }

  // Format dates for SQL (YYYY-MM-DD)
  const startDateStr = start.toISOString().split('T')[0]
  const endDateStr = end.toISOString().split('T')[0]

  // Get all rent periods with due_date in range
  // We need the amount from rent_configs
  const { data: rentPeriods, error: periodsError } = await supabase
    .from('rent_periods')
    .select(
      `
      id,
      due_date,
      status,
      rent_configs!inner(amount)
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .gte('due_date', startDateStr)
    .lte('due_date', endDateStr)

  if (periodsError) {
    console.error('Error fetching rent periods:', periodsError)
    return { data: null, error: 'Failed to fetch rent periods' }
  }

  // Calculate total due (sum of all rent period amounts in range)
  const totalDue =
    (rentPeriods as any[] | null)?.reduce((sum, rp) => {
      const amount = Number(rp.rent_configs?.amount ?? 0)
      return sum + amount
    }, 0) ?? 0

  const periodCount = rentPeriods?.length ?? 0

  // Get rent period IDs that are in our date range
  const periodIdsInRange = new Set(
    (rentPeriods as any[] | null)?.map((rp) => String(rp.id)) ?? []
  )

  if (periodIdsInRange.size === 0) {
    // No periods in range, return zero metrics
    const report: CollectionRateReport = {
      metrics: {
        totalDue: 0,
        totalCollected: 0,
        collectionRate: 0,
        periodCount: 0,
        paidPeriodCount: 0,
      },
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
      },
      generatedAt: new Date().toISOString(),
    }
    return { data: report, error: null }
  }

  // Get all payments for these rent periods where paid_at is in range
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, paid_at, rent_period_id')
    .eq('organization_id', orgRes.data.organizationId)
    .in('rent_period_id', Array.from(periodIdsInRange))
    .gte('paid_at', `${startDateStr}T00:00:00Z`)
    .lte('paid_at', `${endDateStr}T23:59:59Z`)

  if (paymentsError) {
    console.error('Error fetching payments:', paymentsError)
    return { data: null, error: 'Failed to fetch payments' }
  }

  // Calculate total collected (sum of payment amounts)
  const totalCollected =
    (payments as any[] | null)?.reduce((sum, p) => {
      const amount = Number(p.amount ?? 0)
      return sum + amount
    }, 0) ?? 0

  // Count unique paid periods (periods that have at least one payment)
  const paidPeriodIds = new Set(
    (payments as any[] | null)?.map((p) => String(p.rent_period_id)) ?? []
  )
  const paidPeriodCount = paidPeriodIds.size

  // Calculate collection rate percentage
  const collectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 0

  const report: CollectionRateReport = {
    metrics: {
      totalDue,
      totalCollected,
      collectionRate: Math.round(collectionRate * 100) / 100, // Round to 2 decimal places
      periodCount,
      paidPeriodCount,
    },
    dateRange: {
      startDate: startDateStr,
      endDate: endDateStr,
    },
    generatedAt: new Date().toISOString(),
  }

  return { data: report, error: null }
}


