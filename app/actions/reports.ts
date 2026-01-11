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


