# SaaS Multi-Tenancy (EstateIQ v1)

This doc defines the **multi-company** foundation for EstateIQ v1.

## Tenancy model (recommended for v1)

- **Single database, shared schema**
- Every business record is owned by exactly one `Organization` via `orgId`.
- Users belong to orgs via `Membership` (many-to-many) with a `role`.

This keeps v1 simple, deployable, and cost-efficient, while still allowing strong isolation at the application layer (and later, optional Postgres RLS).

## Core entities (auth + tenancy)

- **Organization**
  - Represents a customer company.
  - Has `name`, optional `slug`, timestamps, etc.
- **User**
  - Represents a login identity (email, name, etc.).
- **Membership**
  - Join table: `userId` + `orgId`
  - Contains role and status.

### Roles (v1)

- **OWNER**: full access, billing/admin later
- **MANAGER**: full rent ops access (create/update)
- **OPS**: day-to-day ops access (create/update)
- **DIRECTOR**: read-only dashboards/reports

## Data isolation rules (non-negotiable)

- Every query must be scoped by `orgId`.
- Every write must set `orgId` from the authenticated org context (never from client input).
- IDs from other orgs must be treated as **not found** (avoid information leakage).

## Org context (how the app knows which org)

Two common approaches:

### Option A: Single domain + org switcher (recommended for v1)

- URL: `/app/{orgSlug}/...` (or `/app/...` with “active org” stored in session)
- Easier local dev and simpler DNS
- Works well with internal teams using multiple orgs

### Option B: Subdomain per org

- URL: `{orgSlug}.estateiq.com/...`
- Cleaner customer feel, but adds complexity (DNS, cookies, preview envs)

## Minimum DB schema expectations (rent domain)

Every domain table must include `orgId`, for example:

- `Building(orgId)`
- `Unit(orgId, buildingId)`
- `Tenant(orgId)`
- `Lease|Occupancy(orgId, unitId, tenantId, activeFrom, activeTo)`
- `RentConfig(orgId, leaseId, amount, cycle, dueDay)`
- `RentPeriod(orgId, rentConfigId, periodStart, periodEnd, dueDate, status, daysOverdue)`
- `Payment(orgId, rentPeriodId, amount?, paidAt, reference?)` (v1 can be all-or-nothing if you prefer)
- `ReminderDraft(orgId, rentPeriodId, type, channel, body, status)`
- `DailyBrief(orgId, date, payload)`

## Next decisions needed (to start building Phase 1)

1. **Auth**: Clerk vs NextAuth vs “email magic link” provider
2. **Org context**: Option A (path/org switcher) vs Option B (subdomain)
3. **Payments**: v1 all-or-nothing per rent period, or allow partial payments


