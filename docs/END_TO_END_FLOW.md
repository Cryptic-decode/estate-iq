# EstateIQ End-to-End Flow

This document describes the complete user flow from signup to rent payment tracking.

## Complete User Journey

### 1. Signup & Authentication
- **Signup** (`/signup`): User enters email, password, full name, and company name
- Company name is stored in `localStorage` for onboarding
- User receives email confirmation link
- **Email confirmation** (`/auth/callback`): User clicks link, gets authenticated, redirected to `/app`

### 2. Onboarding
- **Onboarding** (`/app/onboarding`): 
  - Company name is prefilled from `localStorage`
  - User confirms company name
  - Organization is created with:
    - Default currency: **NGN** (Nigerian Naira)
    - User becomes OWNER
  - Redirects to `/app/org/[slug]`

### 3. Portfolio Setup (Phase 1)
- **Buildings** (`/app/org/[slug]/buildings`): Create building records
- **Units** (`/app/org/[slug]/units`): Create units, assign to buildings
- **Tenants** (`/app/org/[slug]/tenants`): Create tenant records with contact info
- **Occupancies** (`/app/org/[slug]/occupancies`): Assign tenants to units with date ranges

### 4. Rent Configuration (Phase 2)
- **Rent Configs** (`/app/org/[slug]/rent-configs`): 
  - Select an occupancy
  - Set rent amount (formatted in org currency, e.g., ₦ for NGN)
  - Set cycle (Monthly, Weekly, Quarterly, Yearly)
  - Set due day (1-31)

### 5. Rent Period Generation & Tracking (Phase 2)
- **Rent Periods** (`/app/org/[slug]/rent-periods`):
  - **Generate periods**: Select a rent config, click "Generate" to create next period
  - Period dates are calculated based on cycle and occupancy dates
  - Due date is set based on due_day
  - **View periods**: See all periods with status (Due, Paid, Overdue)
  - **Update status**: Mark periods as paid/unpaid
  - **Filter**: By status or rent config
  - **Stats**: Total, Paid, Due, Overdue counts and overdue amount

### 6. Settings (OWNER only)
- **Settings** (`/app/org/[slug]/settings`):
  - Update organization currency
  - Changes apply immediately to all currency displays

## Currency Support

- **Default**: NGN (Nigerian Naira) - displays as **₦**
- **Supported currencies**: NGN, USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, ZAR
- **Formatting**: Uses `Intl.NumberFormat` with proper locale and currency code
- **Scope**: Organization-level (all rent amounts use same currency)

## Data Flow

```
User → Signup → Email Confirmation → Onboarding → Org Creation (NGN default)
  ↓
Portfolio Setup:
  Buildings → Units → Tenants → Occupancies
  ↓
Rent Configuration:
  Rent Configs (amount, cycle, due_day per occupancy)
  ↓
Rent Period Generation:
  Generate periods from rent configs
  ↓
Payment Tracking:
  Mark periods as paid/unpaid
```

## Key Features

### Multi-tenancy
- Every record is org-scoped
- RLS enforces isolation at database level
- Role-based access (OWNER, MANAGER, OPS, DIRECTOR)

### Rent Period Generation Logic
- **First period**: Starts from occupancy `active_from` date
- **Subsequent periods**: Start from day after last period `period_end`
- **Period end calculation**:
  - Weekly: +6 days from start
  - Monthly: Last day of the month
  - Quarterly: Last day of the quarter
  - Yearly: Last day of the year
- **Due date**: `due_day` of the period start month
- **Boundary check**: Periods cannot extend beyond occupancy `active_to` date

### Status Management
- **DUE**: Period is upcoming or current, not yet overdue
- **OVERDUE**: Due date has passed, `days_overdue` > 0
- **PAID**: Payment confirmed
- Database trigger automatically updates `days_overdue` and status

## Testing Checklist

### Complete Flow Test
1. ✅ Sign up with email/password/company name
2. ✅ Confirm email and sign in
3. ✅ Complete onboarding (org created with NGN default)
4. ✅ Create a building
5. ✅ Create a unit (assigned to building)
6. ✅ Create a tenant
7. ✅ Create an occupancy (tenant → unit with dates)
8. ✅ Create a rent config (occupancy, amount, cycle, due_day)
9. ✅ Generate rent period(s) from rent config
10. ✅ View rent periods with correct currency formatting (₦)
11. ✅ Mark period as paid
12. ✅ Filter periods by status/config
13. ✅ Update currency in Settings (OWNER only)
14. ✅ Verify currency change reflects in all displays

## Known Limitations / Future Enhancements

- **Rent period generation**: Currently manual (one at a time). Future: bulk generation, scheduled generation
- **Payments**: Currently just status updates. Future: payment records with amounts, dates, references
- **Partial payments**: Not yet supported (all-or-nothing per period)
- **Reminders**: Not yet implemented
- **Daily brief**: Not yet implemented

