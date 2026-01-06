# EstateIQ v1 — Development Phases

This document defines **development phases** for EstateIQ v1 so we can ship iteratively without breaking the core assumptions:

- **Multi-tenancy is non-negotiable**: every domain row is owned by exactly one `organization_id` and access is enforced via Supabase **RLS**.
- **Org context is path-based**: `/app/org/[slug]/...` (Option A).
- **Server Actions + RLS**: prefer server actions for writes, and let RLS be the final enforcement layer.

## Guiding principles

- **Simple first**: ship the smallest end-to-end slice, then expand.
- **DRY + consistent**: reuse the existing patterns in `app/actions/*` and `components/app/*`.
- **Org-scoped by default**: every query is org-scoped; never accept `organization_id` from the client.
- **Role-aware writes**: OWNER/MANAGER/OPS can create/update; OWNER-only destructive actions unless explicitly required.
- **Treat cross-org IDs as “not found”** to avoid information leakage.

## Phase 0 — Foundations (Baseline)

**Goal**: A secure, navigable app shell with authentication + onboarding + org context.

**Already present in repo**:

- Auth (`/signin`, `/signup`, `/auth/callback`)
- `/app` redirect flow (membership check → onboarding or org)
- Onboarding creates org via `create_organization_for_user`
- Middleware protects `/app`

**Done when**:

- User can sign up → confirm email → sign in → create org → land in `/app/org/[slug]`.
- RLS policies allow users to only access rows for orgs they are members of.

## Phase 1 — Portfolio setup (Buildings, Units, Tenants, Occupancies)

**Goal**: Capture the “who lives where” truth so rent can be computed reliably.

**Scope**:

- Buildings CRUD ✅
- Units CRUD ✅ (includes building filter)
- Tenants CRUD
- Occupancies (lease assignments):
  - Assign a tenant to a unit with `active_from` / `active_to`
  - Validate single active occupancy per unit (or define rules if multiples allowed)

**UI routes (pattern)**:

- `/app/org/[slug]/buildings` ✅
- `/app/org/[slug]/units` ✅
- `/app/org/[slug]/tenants`
- `/app/org/[slug]/occupancies`

**Done when**:

- You can create buildings/units/tenants and assign tenants to units via occupancies.
- All reads/writes are org-scoped and role-checked in server actions, with RLS enforcing isolation.

## Phase 2 — Rent definition (Rent configs + Rent periods generation)

**Goal**: Define rent obligations and generate periods so the system can track “due/overdue/paid”.

**Scope**:

- Rent configs per occupancy (amount, cycle, due day, etc.)
- Rent period generation (monthly/weekly rules as decided)
- Status model: `DUE`, `PAID`, `OVERDUE` (and any transitional states needed)

**Key decision**:

- **Payments model**: all-or-nothing per rent period vs partial payments.

**Done when**:

- Given an occupancy + rent config, the system can generate the correct rent periods.
- Periods appear in an org dashboard and are correctly scoped and permissioned.

## Phase 3 — Payment capture (Manual confirmation + reconciliation)

**Goal**: Allow ops to mark rent as paid and maintain an audit trail.

**Scope**:

- Manual “mark paid” (or record payment) flows
- Payment records linked to rent periods
- Basic corrections (undo/adjust) with appropriate permission checks

**Done when**:

- Ops can record payments against rent periods.
- Status updates are accurate (and deterministic if partial payments are supported).

## Phase 4 — Operational workflows (Follow-ups + daily intelligence)

**Goal**: Make the product feel like “rent ops” rather than a database UI.

**Scope**:

- Follow-up queues (due today, overdue, unpaid by building)
- Reminder drafts (email/SMS content generation, even if sending is manual at first)
- Daily brief summary per org

**Done when**:

- A user can open the org dashboard and immediately see what to do today.
- The app surfaces overdue counts and priority tenants/units.

## Phase 5 — Reporting + hardening (Internal SaaS readiness)

**Goal**: Reliability, observability, and leadership reporting.

**Scope**:

- Reporting views (collection rate, delinquency aging, building rollups)
- Performance hardening (indexes, query shaping)
- Audit logs for sensitive actions (membership changes, payment corrections)

**Done when**:

- The app is stable under real usage, with clear reporting and predictable performance.

## Implementation notes (how we’ll build each phase)

- **Routing**: keep org context in the URL (`/app/org/[slug]`) and keep the redirect behavior in `/app` as the entry point.
- **Server Actions**: follow the existing patterns in `app/actions/*`:
  - Resolve org from slug via membership
  - Enforce role checks in the action
  - Query with explicit org filters (RLS also applies)
- **UI**: follow the manager pattern in `components/app/*-manager.tsx`:
  - server-render initial data in route page
  - client component manages refresh via server actions
- **RLS**: treat it as the final gate; actions should still validate org ownership to provide clearer errors.
