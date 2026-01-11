'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContextForUser } from './_org-context'
import { createAuditLog } from './audit-logs'

type Payment = {
  id: string
  organization_id: string
  rent_period_id: string
  amount: number
  paid_at: string
  reference: string | null
  created_at: string
  updated_at: string
}

type PaymentFormData = {
  rent_period_id: string
  amount: number
  paid_at?: string // ISO timestamp string, defaults to NOW()
  reference?: string
}

/**
 * List all payments for an organization (optionally filtered by rent period)
 */
export async function listPayments(
  orgSlug: string,
  rentPeriodId?: string
): Promise<{
  data: Payment[] | null
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

  let query = supabase
    .from('payments')
    .select('*')
    .eq('organization_id', orgRes.data.organizationId)

  if (rentPeriodId) {
    query = query.eq('rent_period_id', rentPeriodId)
  }

  const { data: payments, error } = await query.order('paid_at', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error)
    return { data: null, error: 'Failed to fetch payments' }
  }

  return { data: payments as Payment[], error: null }
}

/**
 * Create a payment and mark rent period as paid
 */
export async function createPayment(
  orgSlug: string,
  formData: PaymentFormData
): Promise<{ data: Payment | null; error: string | null }> {
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

  // Validate role: OWNER, MANAGER, or OPS can create
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Validate input
  if (!formData.rent_period_id || formData.rent_period_id.trim().length === 0) {
    return { data: null, error: 'Rent period is required' }
  }

  if (!formData.amount || formData.amount <= 0) {
    return { data: null, error: 'Amount must be greater than 0' }
  }

  // Verify rent period belongs to the same org
  const { data: rentPeriod, error: rentPeriodError } = await supabase
    .from('rent_periods')
    .select('id, organization_id, status')
    .eq('id', formData.rent_period_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentPeriodError || !rentPeriod) {
    return { data: null, error: 'Rent period not found or does not belong to this organization' }
  }

  // Create payment
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      organization_id: orgRes.data.organizationId,
      rent_period_id: formData.rent_period_id,
      amount: formData.amount,
      paid_at: formData.paid_at || new Date().toISOString(),
      reference: formData.reference?.trim() || null,
    })
    .select()
    .single()

  if (paymentError) {
    console.error('Error creating payment:', paymentError)
    return { data: null, error: 'Failed to create payment' }
  }

  // Mark rent period as paid (triggers days_overdue recalculation to 0)
  const { error: updateError } = await supabase
    .from('rent_periods')
    .update({ status: 'PAID' })
    .eq('id', formData.rent_period_id)
    .eq('organization_id', orgRes.data.organizationId)

  if (updateError) {
    console.error('Error updating rent period status:', updateError)
    // Rollback payment creation
    await supabase.from('payments').delete().eq('id', payment.id)
    return { data: null, error: 'Failed to mark rent period as paid' }
  }

  // Log audit entry
  await createAuditLog(
    orgRes.data.organizationId,
    user.id,
    'PAYMENT_CREATED',
    'payment',
    `Payment created: ${payment.amount} for rent period ${payment.rent_period_id}`,
    {
      entityId: payment.id,
      metadata: {
        after: {
          amount: payment.amount,
          paid_at: payment.paid_at,
          reference: payment.reference,
          rent_period_id: payment.rent_period_id,
        },
      },
    }
  )

  return { data: payment as Payment, error: null }
}

/**
 * Update a payment
 */
export async function updatePayment(
  orgSlug: string,
  paymentId: string,
  formData: Partial<PaymentFormData>
): Promise<{ data: Payment | null; error: string | null }> {
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

  // Validate role: OWNER, MANAGER, or OPS can update
  if (!['OWNER', 'MANAGER', 'OPS'].includes(orgRes.data.role)) {
    return { data: null, error: 'Insufficient permissions' }
  }

  // Verify payment belongs to org (get full details for audit log)
  const { data: existingPayment, error: paymentError } = await supabase
    .from('payments')
    .select('id, organization_id, rent_period_id, amount, paid_at, reference')
    .eq('id', paymentId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (paymentError || !existingPayment) {
    return { data: null, error: 'Payment not found or access denied' }
  }

  // Validate amount if provided
  if (formData.amount !== undefined && formData.amount <= 0) {
    return { data: null, error: 'Amount must be greater than 0' }
  }

  // Prepare update data
  const updateData: {
    amount?: number
    paid_at?: string
    reference?: string | null
  } = {}

  if (formData.amount !== undefined) {
    updateData.amount = formData.amount
  }

  if (formData.paid_at) {
    updateData.paid_at = formData.paid_at
  }

  if (formData.reference !== undefined) {
    updateData.reference = formData.reference?.trim() || null
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .eq('organization_id', orgRes.data.organizationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating payment:', error)
    return { data: null, error: 'Failed to update payment' }
  }

  // Log audit entry if significant changes were made
  const hasChanges =
    (formData.amount !== undefined && formData.amount !== existingPayment.amount) ||
    (formData.paid_at !== undefined && formData.paid_at !== existingPayment.paid_at) ||
    (formData.reference !== undefined && formData.reference !== existingPayment.reference)

  if (hasChanges) {
    await createAuditLog(
      orgRes.data.organizationId,
      user.id,
      'PAYMENT_UPDATED',
      'payment',
      `Payment updated: ${payment.amount} for rent period ${payment.rent_period_id}`,
      {
        entityId: paymentId,
        metadata: {
          before: {
            amount: existingPayment.amount,
            paid_at: existingPayment.paid_at,
            reference: existingPayment.reference,
          },
          after: {
            amount: payment.amount,
            paid_at: payment.paid_at,
            reference: payment.reference,
          },
        },
      }
    )
  }

  return { data: payment as Payment, error: null }
}

/**
 * Delete a payment (OWNER only) and revert rent period status if needed
 */
export async function deletePayment(
  orgSlug: string,
  paymentId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const orgRes = await getOrgContextForUser(supabase, user.id, orgSlug)
  if (orgRes.error || !orgRes.data) {
    return { error: orgRes.error }
  }

  // Validate role: Only OWNER can delete
  if (orgRes.data.role !== 'OWNER') {
    return { error: 'Only organization owners can delete payments' }
  }

  // Get payment with rent period info (including amount for audit log)
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, organization_id, rent_period_id, amount, paid_at, reference')
    .eq('id', paymentId)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (paymentError || !payment) {
    return { error: 'Payment not found or access denied' }
  }

  // Get rent period to check if there are other payments
  const { data: rentPeriod, error: rentPeriodError } = await supabase
    .from('rent_periods')
    .select('id, due_date, status')
    .eq('id', payment.rent_period_id)
    .eq('organization_id', orgRes.data.organizationId)
    .single()

  if (rentPeriodError || !rentPeriod) {
    return { error: 'Rent period not found' }
  }

  // Check if there are other payments for this rent period
  const { data: otherPayments, error: otherPaymentsError } = await supabase
    .from('payments')
    .select('id')
    .eq('rent_period_id', payment.rent_period_id)
    .neq('id', paymentId)
    .eq('organization_id', orgRes.data.organizationId)

  if (otherPaymentsError) {
    console.error('Error checking other payments:', otherPaymentsError)
    return { error: 'Failed to check other payments' }
  }

  // Delete payment
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('organization_id', orgRes.data.organizationId)

  if (deleteError) {
    console.error('Error deleting payment:', deleteError)
    return { error: 'Failed to delete payment' }
  }

  // If this was the only payment, revert rent period status
  const previousStatus = rentPeriod.status
  let newStatus = previousStatus

  if (!otherPayments || otherPayments.length === 0) {
    const dueDate = new Date(rentPeriod.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)

    // Determine new status based on due date
    newStatus = today > dueDate ? 'OVERDUE' : 'DUE'

    const { error: updateError } = await supabase
      .from('rent_periods')
      .update({ status: newStatus })
      .eq('id', payment.rent_period_id)
      .eq('organization_id', orgRes.data.organizationId)

    if (updateError) {
      console.error('Error reverting rent period status:', updateError)
      // Payment is already deleted, so we'll just log the error
      // The rent period will remain as PAID, which is acceptable
    }
  }

  // Log audit entry
  await createAuditLog(
    orgRes.data.organizationId,
    user.id,
    'PAYMENT_DELETED',
    'payment',
    `Payment deleted: ${payment.amount} for rent period ${payment.rent_period_id}`,
    {
      entityId: paymentId,
      metadata: {
        before: {
          amount: payment.amount,
          paid_at: payment.paid_at,
          reference: payment.reference,
          rent_period_id: payment.rent_period_id,
          rent_period_status: previousStatus,
        },
        after: {
          rent_period_status: newStatus,
        },
      },
    }
  )

  return { error: null }
}

