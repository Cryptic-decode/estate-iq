'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'
import { formatCurrency } from '@/lib/utils/currency'

/**
 * Overdue rent period with full context (tenant, unit, building, rent config)
 */
export type OverdueRentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'OVERDUE'
  days_overdue: number
  created_at: string
  updated_at: string
  rent_config: {
    id: string
    amount: number
    cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    due_day: number
    occupancy_id: string
    occupancy: {
      id: string
      active_from: string
      active_to: string | null
      unit_id: string
      tenant_id: string
      unit: {
        id: string
        unit_number: string
        building_id: string
        building: {
          id: string
          name: string
          address: string | null
        }
      }
      tenant: {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    }
  }
}

/**
 * Fetch overdue rent periods with tenant/unit/building details for follow-up queue
 */
export async function getOverdueRentPeriods(orgSlug: string): Promise<{
  data: OverdueRentPeriod[] | null
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

  // Fetch overdue rent periods with nested relationships
  const { data: rentPeriods, error } = await supabase
    .from('rent_periods')
    .select(
      `
      *,
      rent_configs!inner(
        id,
        amount,
        cycle,
        due_day,
        occupancy_id,
        occupancies!inner(
          id,
          active_from,
          active_to,
          unit_id,
          tenant_id,
          units!inner(
            id,
            unit_number,
            building_id,
            buildings!inner(
              id,
              name,
              address
            )
          ),
          tenants!inner(
            id,
            full_name,
            email,
            phone
          )
        )
      )
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .eq('status', 'OVERDUE')
    .gt('days_overdue', 0)
    .order('days_overdue', { ascending: false })
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching overdue rent periods:', error)
    return { data: null, error: 'Failed to fetch overdue rent periods' }
  }

  // Transform the nested structure to match our type
  // Supabase nested selects can return arrays or objects depending on relationship type
  // Normalize to handle both cases (following pattern from organizations.ts)
  const transformed = (rentPeriods || [])
    .map((rp: any) => {
      // Normalize rent_configs (should be single object due to FK, but handle array case)
      const rawRentConfig = rp.rent_configs
      const rentConfig = Array.isArray(rawRentConfig) ? rawRentConfig[0] : rawRentConfig

      if (!rentConfig) {
        return null // Skip if rent config is missing
      }

      // Normalize occupancies (should be single object due to FK)
      const rawOccupancy = rentConfig.occupancies
      const occupancy = Array.isArray(rawOccupancy) ? rawOccupancy[0] : rawOccupancy

      if (!occupancy) {
        return null // Skip if occupancy is missing
      }

      // Normalize units (should be single object due to FK)
      const rawUnit = occupancy.units
      const unit = Array.isArray(rawUnit) ? rawUnit[0] : rawUnit

      if (!unit) {
        return null // Skip if unit is missing
      }

      // Normalize buildings (should be single object due to FK)
      const rawBuilding = unit.buildings
      const building = Array.isArray(rawBuilding) ? rawBuilding[0] : rawBuilding

      if (!building) {
        return null // Skip if building is missing
      }

      // Normalize tenants (should be single object due to FK)
      const rawTenant = occupancy.tenants
      const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant

      if (!tenant) {
        return null // Skip if tenant is missing
      }

      return {
        id: rp.id,
        organization_id: rp.organization_id,
        rent_config_id: rp.rent_config_id,
        period_start: rp.period_start,
        period_end: rp.period_end,
        due_date: rp.due_date,
        status: rp.status as 'OVERDUE',
        days_overdue: rp.days_overdue,
        created_at: rp.created_at,
        updated_at: rp.updated_at,
        rent_config: {
          id: rentConfig.id,
          amount: parseFloat(rentConfig.amount),
          cycle: rentConfig.cycle,
          due_day: rentConfig.due_day,
          occupancy_id: rentConfig.occupancy_id,
          occupancy: {
            id: occupancy.id,
            active_from: occupancy.active_from,
            active_to: occupancy.active_to,
            unit_id: occupancy.unit_id,
            tenant_id: occupancy.tenant_id,
            unit: {
              id: unit.id,
              unit_number: unit.unit_number,
              building_id: unit.building_id,
              building: {
                id: building.id,
                name: building.name,
                address: building.address,
              },
            },
            tenant: {
              id: tenant.id,
              full_name: tenant.full_name,
              email: tenant.email,
              phone: tenant.phone,
            },
          },
        },
      }
    })
    .filter((item): item is OverdueRentPeriod => item !== null)

  return { data: transformed as OverdueRentPeriod[], error: null }
}

/**
 * Rent period due today with full context (tenant, unit, building, rent config)
 */
export type DueTodayRentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'DUE'
  days_overdue: number
  created_at: string
  updated_at: string
  rent_config: {
    id: string
    amount: number
    cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    due_day: number
    occupancy_id: string
    occupancy: {
      id: string
      active_from: string
      active_to: string | null
      unit_id: string
      tenant_id: string
      unit: {
        id: string
        unit_number: string
        building_id: string
        building: {
          id: string
          name: string
          address: string | null
        }
      }
      tenant: {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    }
  }
}

/**
 * Fetch rent periods due today with tenant/unit/building details for follow-up queue
 */
export async function getDueTodayRentPeriods(orgSlug: string): Promise<{
  data: DueTodayRentPeriod[] | null
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

  // Get today's date in YYYY-MM-DD format (ISO date string)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Fetch rent periods due today with nested relationships
  const { data: rentPeriods, error } = await supabase
    .from('rent_periods')
    .select(
      `
      *,
      rent_configs!inner(
        id,
        amount,
        cycle,
        due_day,
        occupancy_id,
        occupancies!inner(
          id,
          active_from,
          active_to,
          unit_id,
          tenant_id,
          units!inner(
            id,
            unit_number,
            building_id,
            buildings!inner(
              id,
              name,
              address
            )
          ),
          tenants!inner(
            id,
            full_name,
            email,
            phone
          )
        )
      )
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .eq('due_date', todayStr)
    .eq('status', 'DUE')
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching rent periods due today:', error)
    return { data: null, error: 'Failed to fetch rent periods due today' }
  }

  // Transform the nested structure to match our type
  // Supabase nested selects can return arrays or objects depending on relationship type
  // Normalize to handle both cases (following pattern from organizations.ts)
  const transformed = (rentPeriods || [])
    .map((rp: any) => {
      // Normalize rent_configs (should be single object due to FK, but handle array case)
      const rawRentConfig = rp.rent_configs
      const rentConfig = Array.isArray(rawRentConfig) ? rawRentConfig[0] : rawRentConfig

      if (!rentConfig) {
        return null // Skip if rent config is missing
      }

      // Normalize occupancies (should be single object due to FK)
      const rawOccupancy = rentConfig.occupancies
      const occupancy = Array.isArray(rawOccupancy) ? rawOccupancy[0] : rawOccupancy

      if (!occupancy) {
        return null // Skip if occupancy is missing
      }

      // Normalize units (should be single object due to FK)
      const rawUnit = occupancy.units
      const unit = Array.isArray(rawUnit) ? rawUnit[0] : rawUnit

      if (!unit) {
        return null // Skip if unit is missing
      }

      // Normalize buildings (should be single object due to FK)
      const rawBuilding = unit.buildings
      const building = Array.isArray(rawBuilding) ? rawBuilding[0] : rawBuilding

      if (!building) {
        return null // Skip if building is missing
      }

      // Normalize tenants (should be single object due to FK)
      const rawTenant = occupancy.tenants
      const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant

      if (!tenant) {
        return null // Skip if tenant is missing
      }

      return {
        id: rp.id,
        organization_id: rp.organization_id,
        rent_config_id: rp.rent_config_id,
        period_start: rp.period_start,
        period_end: rp.period_end,
        due_date: rp.due_date,
        status: rp.status as 'DUE',
        days_overdue: rp.days_overdue,
        created_at: rp.created_at,
        updated_at: rp.updated_at,
        rent_config: {
          id: rentConfig.id,
          amount: parseFloat(rentConfig.amount),
          cycle: rentConfig.cycle,
          due_day: rentConfig.due_day,
          occupancy_id: rentConfig.occupancy_id,
          occupancy: {
            id: occupancy.id,
            active_from: occupancy.active_from,
            active_to: occupancy.active_to,
            unit_id: occupancy.unit_id,
            tenant_id: occupancy.tenant_id,
            unit: {
              id: unit.id,
              unit_number: unit.unit_number,
              building_id: unit.building_id,
              building: {
                id: building.id,
                name: building.name,
                address: building.address,
              },
            },
            tenant: {
              id: tenant.id,
              full_name: tenant.full_name,
              email: tenant.email,
              phone: tenant.phone,
            },
          },
        },
      }
    })
    .filter((item): item is DueTodayRentPeriod => item !== null)

  return { data: transformed as DueTodayRentPeriod[], error: null }
}

/**
 * Unpaid rent period with full context (tenant, unit, building, rent config)
 */
export type UnpaidRentPeriod = {
  id: string
  organization_id: string
  rent_config_id: string
  period_start: string
  period_end: string
  due_date: string
  status: 'DUE' | 'OVERDUE'
  days_overdue: number
  created_at: string
  updated_at: string
  rent_config: {
    id: string
    amount: number
    cycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
    due_day: number
    occupancy_id: string
    occupancy: {
      id: string
      active_from: string
      active_to: string | null
      unit_id: string
      tenant_id: string
      unit: {
        id: string
        unit_number: string
        building_id: string
        building: {
          id: string
          name: string
          address: string | null
        }
      }
      tenant: {
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }
    }
  }
}

/**
 * Building with unpaid rent periods grouped together
 */
export type BuildingWithUnpaidPeriods = {
  building: {
    id: string
    name: string
    address: string | null
  }
  unpaidPeriods: UnpaidRentPeriod[]
  totalUnpaidAmount: number
  overdueCount: number
  dueCount: number
}

/**
 * Fetch unpaid rent periods grouped by building for building-level view
 */
export async function getUnpaidRentPeriodsByBuilding(orgSlug: string): Promise<{
  data: BuildingWithUnpaidPeriods[] | null
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

  // Fetch unpaid rent periods (DUE or OVERDUE, not PAID) with nested relationships
  const { data: rentPeriods, error } = await supabase
    .from('rent_periods')
    .select(
      `
      *,
      rent_configs!inner(
        id,
        amount,
        cycle,
        due_day,
        occupancy_id,
        occupancies!inner(
          id,
          active_from,
          active_to,
          unit_id,
          tenant_id,
          units!inner(
            id,
            unit_number,
            building_id,
            buildings!inner(
              id,
              name,
              address
            )
          ),
          tenants!inner(
            id,
            full_name,
            email,
            phone
          )
        )
      )
    `
    )
    .eq('organization_id', orgRes.data.organizationId)
    .in('status', ['DUE', 'OVERDUE'])
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching unpaid rent periods:', error)
    return { data: null, error: 'Failed to fetch unpaid rent periods' }
  }

  // Transform the nested structure and normalize
  const transformed = (rentPeriods || [])
    .map((rp: any) => {
      // Normalize rent_configs (should be single object due to FK, but handle array case)
      const rawRentConfig = rp.rent_configs
      const rentConfig = Array.isArray(rawRentConfig) ? rawRentConfig[0] : rawRentConfig

      if (!rentConfig) {
        return null // Skip if rent config is missing
      }

      // Normalize occupancies (should be single object due to FK)
      const rawOccupancy = rentConfig.occupancies
      const occupancy = Array.isArray(rawOccupancy) ? rawOccupancy[0] : rawOccupancy

      if (!occupancy) {
        return null // Skip if occupancy is missing
      }

      // Normalize units (should be single object due to FK)
      const rawUnit = occupancy.units
      const unit = Array.isArray(rawUnit) ? rawUnit[0] : rawUnit

      if (!unit) {
        return null // Skip if unit is missing
      }

      // Normalize buildings (should be single object due to FK)
      const rawBuilding = unit.buildings
      const building = Array.isArray(rawBuilding) ? rawBuilding[0] : rawBuilding

      if (!building) {
        return null // Skip if building is missing
      }

      // Normalize tenants (should be single object due to FK)
      const rawTenant = occupancy.tenants
      const tenant = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant

      if (!tenant) {
        return null // Skip if tenant is missing
      }

      return {
        id: rp.id,
        organization_id: rp.organization_id,
        rent_config_id: rp.rent_config_id,
        period_start: rp.period_start,
        period_end: rp.period_end,
        due_date: rp.due_date,
        status: rp.status as 'DUE' | 'OVERDUE',
        days_overdue: rp.days_overdue,
        created_at: rp.created_at,
        updated_at: rp.updated_at,
        rent_config: {
          id: rentConfig.id,
          amount: parseFloat(rentConfig.amount),
          cycle: rentConfig.cycle,
          due_day: rentConfig.due_day,
          occupancy_id: rentConfig.occupancy_id,
          occupancy: {
            id: occupancy.id,
            active_from: occupancy.active_from,
            active_to: occupancy.active_to,
            unit_id: occupancy.unit_id,
            tenant_id: occupancy.tenant_id,
            unit: {
              id: unit.id,
              unit_number: unit.unit_number,
              building_id: unit.building_id,
              building: {
                id: building.id,
                name: building.name,
                address: building.address,
              },
            },
            tenant: {
              id: tenant.id,
              full_name: tenant.full_name,
              email: tenant.email,
              phone: tenant.phone,
            },
          },
        },
      }
    })
    .filter((item): item is UnpaidRentPeriod => item !== null)

  // Group by building
  const buildingMap = new Map<string, BuildingWithUnpaidPeriods>()

  for (const period of transformed) {
    const buildingId = period.rent_config.occupancy.unit.building.id
    const building = period.rent_config.occupancy.unit.building

    if (!buildingMap.has(buildingId)) {
      buildingMap.set(buildingId, {
        building: {
          id: building.id,
          name: building.name,
          address: building.address,
        },
        unpaidPeriods: [],
        totalUnpaidAmount: 0,
        overdueCount: 0,
        dueCount: 0,
      })
    }

    const buildingGroup = buildingMap.get(buildingId)!
    buildingGroup.unpaidPeriods.push(period)
    buildingGroup.totalUnpaidAmount += period.rent_config.amount

    if (period.status === 'OVERDUE') {
      buildingGroup.overdueCount++
    } else {
      buildingGroup.dueCount++
    }
  }

  // Convert map to array and sort by building name
  const result = Array.from(buildingMap.values()).sort((a, b) =>
    a.building.name.localeCompare(b.building.name)
  )

  // Sort periods within each building by due_date (oldest first)
  result.forEach((group) => {
    group.unpaidPeriods.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime()
      const dateB = new Date(b.due_date).getTime()
      return dateA - dateB
    })
  })

  return { data: result, error: null }
}

/**
 * Reminder draft types
 */
export type ReminderDraft = {
  email: {
    subject: string
    body: string
  }
  sms: string
}

export type ReminderTone = 'friendly' | 'formal' | 'urgent'

/**
 * Generate reminder draft (email/SMS) for a rent period
 * Returns text that can be manually copied and sent
 */
export async function generateReminderDraft(
  period: OverdueRentPeriod | DueTodayRentPeriod | UnpaidRentPeriod,
  currency: string,
  orgName: string,
  tone: ReminderTone = 'friendly'
): Promise<ReminderDraft> {
  const tenant = period.rent_config.occupancy.tenant
  const unit = period.rent_config.occupancy.unit
  const building = period.rent_config.occupancy.unit.building
  const amount = period.rent_config.amount
  const dueDate = new Date(period.due_date)
  const isOverdue = period.status === 'OVERDUE'
  const daysOverdue = isOverdue ? period.days_overdue : 0

  // Format dates
  const dueDateFormatted = dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const amountFormatted = formatCurrency(amount, currency)
  const unitLabel = `${building.name} - Unit ${unit.unit_number}`

  // Determine tone and urgency level
  let greeting: string
  let bodyTone: string
  let closing: string

  if (tone === 'urgent' || (isOverdue && daysOverdue > 7)) {
    greeting = `Dear ${tenant.full_name},`
    bodyTone = isOverdue
      ? `We hope this message finds you well. We wanted to bring to your attention that your rent payment for ${unitLabel} is currently ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`
      : `We hope this message finds you well. This is a friendly reminder that your rent payment for ${unitLabel} is due today.`
    closing = `Please arrange payment at your earliest convenience. If you have already made the payment, please disregard this message. If you are experiencing any difficulties, please contact us immediately so we can discuss payment arrangements.`
  } else if (tone === 'formal') {
    greeting = `Dear ${tenant.full_name},`
    bodyTone = isOverdue
      ? `This is to inform you that your rent payment for ${unitLabel} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`
      : `This is a reminder that your rent payment for ${unitLabel} is due today.`
    closing = `Please ensure payment is made promptly. If payment has already been made, please ignore this notice. For any payment-related inquiries, please contact our office.`
  } else {
    // friendly
    greeting = `Hi ${tenant.full_name},`
    bodyTone = isOverdue
      ? `Hope you're doing well! Just a quick reminder that your rent payment for ${unitLabel} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.`
      : `Hope you're doing well! Just a friendly reminder that your rent payment for ${unitLabel} is due today.`
    closing = `If you've already sent the payment, no worries—just ignore this message. If you need to discuss anything or have questions, feel free to reach out!`
  }

  // Email subject
  const emailSubject = isOverdue
    ? `Rent Payment Overdue - ${unitLabel} (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''})`
    : `Rent Payment Reminder - ${unitLabel}`

  // Email body
  const emailBody = `${greeting}

${bodyTone}

Payment Details:
- Amount: ${amountFormatted}
- Due Date: ${dueDateFormatted}
- Property: ${unitLabel}${building.address ? `\n- Address: ${building.address}` : ''}

${closing}

Thank you for your attention to this matter.

Best regards,
${orgName}`

  // SMS (shorter, more concise)
  const smsBody = isOverdue
    ? `Hi ${tenant.full_name}, your rent for ${unitLabel} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Amount: ${amountFormatted}. Due: ${dueDateFormatted}. Please arrange payment. ${orgName}`
    : `Hi ${tenant.full_name}, friendly reminder: rent for ${unitLabel} is due today. Amount: ${amountFormatted}. Please arrange payment. ${orgName}`

  return {
    email: {
      subject: emailSubject,
      body: emailBody,
    },
    sms: smsBody,
  }
}

/**
 * Generate reminder draft for multiple periods (batch reminder)
 */
export async function generateBatchReminderDraft(
  periods: (OverdueRentPeriod | DueTodayRentPeriod | UnpaidRentPeriod)[],
  currency: string,
  orgName: string,
  tone: ReminderTone = 'friendly'
): Promise<ReminderDraft> {
  if (periods.length === 0) {
    return {
      email: {
        subject: 'Rent Payment Reminder',
        body: 'No periods to include in reminder.',
      },
      sms: 'No periods to include in reminder.',
    }
  }

  if (periods.length === 1) {
    return await generateReminderDraft(periods[0], currency, orgName, tone)
  }

  // For multiple periods, use the first tenant (assuming same tenant for batch)
  const firstPeriod = periods[0]
  const tenant = firstPeriod.rent_config.occupancy.tenant
  const totalAmount = periods.reduce((sum, p) => sum + p.rent_config.amount, 0)
  const overdueCount = periods.filter((p) => p.status === 'OVERDUE').length
  const dueCount = periods.filter((p) => p.status === 'DUE').length

  const greeting = tone === 'formal' ? `Dear ${tenant.full_name},` : `Hi ${tenant.full_name},`

  let bodyTone: string
  if (tone === 'urgent' || overdueCount > 0) {
    bodyTone = `We hope this message finds you well. We wanted to bring to your attention that you have ${periods.length} rent payment${periods.length !== 1 ? 's' : ''} requiring attention.`
  } else if (tone === 'formal') {
    bodyTone = `This is to inform you that you have ${periods.length} rent payment${periods.length !== 1 ? 's' : ''} due.`
  } else {
    bodyTone = `Hope you're doing well! Just a quick reminder that you have ${periods.length} rent payment${periods.length !== 1 ? 's' : ''} requiring attention.`
  }

  const closing = tone === 'formal'
    ? `Please ensure payments are made promptly. If payments have already been made, please ignore this notice. For any payment-related inquiries, please contact our office.`
    : tone === 'urgent'
      ? `Please arrange payments at your earliest convenience. If you have already made the payments, please disregard this message. If you are experiencing any difficulties, please contact us immediately.`
      : `If you've already sent the payments, no worries—just ignore this message. If you need to discuss anything or have questions, feel free to reach out!`

  const emailSubject = overdueCount > 0
    ? `Multiple Rent Payments Overdue - ${overdueCount} overdue, ${dueCount} due`
    : `Rent Payment Reminder - ${periods.length} payment${periods.length !== 1 ? 's' : ''} due`

  const paymentDetails = periods
    .map((p) => {
      const unit = p.rent_config.occupancy.unit
      const building = p.rent_config.occupancy.unit.building
      const dueDate = new Date(p.due_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const isOverdue = p.status === 'OVERDUE'
      const daysOverdue = isOverdue ? p.days_overdue : 0
      const unitLabel = `${building.name} - Unit ${unit.unit_number}`
      const amountFormatted = formatCurrency(p.rent_config.amount, currency)

      return `- ${unitLabel}: ${amountFormatted} (Due: ${dueDate}${isOverdue ? `, ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue` : ''})`
    })
    .join('\n')

  const emailBody = `${greeting}

${bodyTone}

Payment Details:
${paymentDetails}

Total Amount: ${formatCurrency(totalAmount, currency)}

${closing}

Thank you for your attention to this matter.

Best regards,
${orgName}`

  const smsBody = overdueCount > 0
    ? `Hi ${tenant.full_name}, you have ${overdueCount} overdue and ${dueCount} due rent payment${periods.length !== 1 ? 's' : ''}. Total: ${formatCurrency(totalAmount, currency)}. Please arrange payment. ${orgName}`
    : `Hi ${tenant.full_name}, you have ${periods.length} rent payment${periods.length !== 1 ? 's' : ''} due. Total: ${formatCurrency(totalAmount, currency)}. Please arrange payment. ${orgName}`

  return {
    email: {
      subject: emailSubject,
      body: emailBody,
    },
    sms: smsBody,
  }
}

