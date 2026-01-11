# Testing Guide

This document provides step-by-step testing instructions for key features in EstateIQ.

## Reports Testing

### 1. Overdue Analysis Report

**Setup:**

1. Ensure you have rent periods with different overdue statuses:
   - Some with status `DUE` (not yet overdue)
   - Some with status `OVERDUE` with varying `days_overdue` values

**Test Steps:**

1. Navigate to `/app/org/[slug]/reports`
2. Click "View report" on the "Overdue Analysis" card
3. Verify:
   - Summary cards show correct totals (Unpaid periods, Unpaid amount, Due, Overdue)
   - Aging buckets table displays:
     - 0–7 days bucket with correct count and amount
     - 8–15 days bucket with correct count and amount
     - 16–30 days bucket with correct count and amount
     - 31+ days bucket with correct count and amount
   - Totals match the sum of all buckets
4. Click "Refresh" button - verify loading state and success toast
5. Test empty state: If no unpaid periods exist, verify empty state message displays

**Expected Results:**

- All unpaid periods (DUE + OVERDUE) are grouped into correct aging buckets
- Amounts are formatted with correct currency
- Buckets are sorted by days overdue (0–7, 8–15, 16–30, 31+)

### 2. Building Rollups Report

**Setup:**

1. Ensure you have multiple buildings with unpaid rent periods

**Test Steps:**

1. Navigate to `/app/org/[slug]/reports`
2. Click "View report" on the "Building Rollups" card
3. Verify:
   - Summary cards show totals (Buildings with unpaid, Unpaid amount, Overdue/Due counts)
   - Table lists all buildings with unpaid periods
   - Buildings are sorted by unpaid amount (largest first)
   - Each building row shows:
     - Building name and address
     - Unpaid amount
     - Overdue count
     - Due count
     - Total unpaid periods
4. Click "Open operational view" - should navigate to `/buildings-unpaid`
5. Click "Refresh" - verify loading state and success toast

**Expected Results:**

- All buildings with unpaid periods are listed
- Totals match sum of individual building amounts
- Sorting works correctly (largest unpaid amount first)

## Audit Logs Testing

### Audit Trail UI (recommended)

1. Navigate to `/app/org/[slug]/reports`
2. Open **Audit trail** → **View audit trail**
3. Verify:
   - Events load and are ordered newest-first
   - “View details” expands metadata JSON when present
   - Filters work (Action / Entity / Entity ID) and “Clear” resets filters
4. Perform an action (e.g., create a payment) and click **Refresh** to confirm a new event appears

### Prerequisites

1. Apply migration `013_audit_logs.sql` in Supabase dashboard
2. Ensure you have an organization with some data

### 1. Payment Audit Logs

**Test: Create Payment**

1. Navigate to `/app/org/[slug]/payments`
2. Create a new payment for a rent period
3. In Supabase dashboard, run:
   ```sql
   SELECT * FROM audit_logs
   WHERE action_type = 'PAYMENT_CREATED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
4. Verify:
   - `action_type` = 'PAYMENT_CREATED'
   - `entity_type` = 'payment'
   - `entity_id` = payment ID
   - `description` contains payment details
   - `metadata.after` contains amount, paid_at, reference
   - `user_id` matches your user ID
   - `organization_id` matches your org ID

**Test: Update Payment**

1. Navigate to `/app/org/[slug]/payments`
2. Edit an existing payment (change amount or date)
3. In Supabase, query:
   ```sql
   SELECT * FROM audit_logs
   WHERE action_type = 'PAYMENT_UPDATED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
4. Verify:
   - `action_type` = 'PAYMENT_UPDATED'
   - `metadata.before` contains old values
   - `metadata.after` contains new values

**Test: Delete Payment (OWNER only)**

1. Navigate to `/app/org/[slug]/payments`
2. Delete a payment (must be OWNER role)
3. In Supabase, query:
   ```sql
   SELECT * FROM audit_logs
   WHERE action_type = 'PAYMENT_DELETED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
4. Verify:
   - `action_type` = 'PAYMENT_DELETED'
   - `metadata.before` contains deleted payment details
   - `metadata.after` shows rent period status change (if applicable)

### 2. Organization Settings Audit Logs

**Test: Update Currency**

1. Navigate to `/app/org/[slug]/settings`
2. Change organization currency (must be OWNER role)
3. In Supabase, query:
   ```sql
   SELECT * FROM audit_logs
   WHERE action_type = 'ORGANIZATION_CURRENCY_UPDATED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
4. Verify:
   - `action_type` = 'ORGANIZATION_CURRENCY_UPDATED'
   - `entity_type` = 'organization'
   - `metadata.before.currency` = old currency
   - `metadata.after.currency` = new currency

### 3. Rent Period Status Audit Logs

**Test: Manual Status Change**

1. Navigate to `/app/org/[slug]/rent-periods`
2. Manually change a rent period status (e.g., from DUE to PAID)
3. In Supabase, query:
   ```sql
   SELECT * FROM audit_logs
   WHERE action_type = 'RENT_PERIOD_STATUS_CHANGED'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
4. Verify:
   - `action_type` = 'RENT_PERIOD_STATUS_CHANGED'
   - `entity_type` = 'rent_period'
   - `metadata.before.status` = old status
   - `metadata.after.status` = new status

### 4. Audit Log Query Testing

**Test: List Audit Logs (Server Action)**

1. Use the `listAuditLogs` server action in a test script or component
2. Test filters:
   - Filter by `actionType`
   - Filter by `entityType`
   - Filter by `entityId`
   - Test `limit` parameter
3. Verify:
   - Only returns logs for your organization
   - Filters work correctly
   - Results are ordered by `created_at DESC`
   - Limit is respected

**Example Query:**

```typescript
import { listAuditLogs } from "@/app/actions/audit-logs";

const result = await listAuditLogs("your-org-slug", {
  actionType: "PAYMENT_DELETED",
  limit: 10,
});
```

## Verification Checklist

### Reports

- [ ] Overdue Analysis report displays correctly
- [ ] Building Rollups report displays correctly
- [ ] Both reports show accurate data
- [ ] Refresh buttons work
- [ ] Empty states display when no data
- [ ] Loading states show skeletons

### Audit Logs

- [ ] Payment creation is logged
- [ ] Payment updates are logged (only when changes occur)
- [ ] Payment deletion is logged
- [ ] Currency updates are logged
- [ ] Rent period status changes are logged (only when status actually changes)
- [ ] All logs include correct user_id and organization_id
- [ ] Metadata contains before/after values where applicable
- [ ] RLS policies prevent cross-org access

## Common Issues

**Issue: No audit logs appearing**

- Check that migration `013_audit_logs.sql` was applied
- Verify RLS policies allow inserts for authenticated org members
- Check browser console for errors

**Issue: Reports showing incorrect data**

- Verify rent periods have correct `status` and `days_overdue` values
- Check that rent configs have `amount` values
- Ensure organization_id matches in all related records

**Issue: Audit log query returns empty**

- Verify you're querying the correct organization
- Check that actions were actually performed (not just attempted)
- Ensure user has proper role/permissions
