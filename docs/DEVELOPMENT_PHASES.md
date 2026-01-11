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

## Phase 1 — Portfolio setup (Buildings, Units, Tenants, Occupancies) ✅

**Goal**: Capture the “who lives where” truth so rent can be computed reliably.

**Scope**:

- Buildings CRUD ✅
- Units CRUD ✅ (includes building filter)
- Tenants CRUD ✅
- Occupancies (lease assignments): ✅
  - Assign a tenant to a unit with `active_from` / `active_to`
  - Validate single active occupancy per unit (or define rules if multiples allowed)

**UI routes (pattern)**:

- `/app/org/[slug]/buildings` ✅
- `/app/org/[slug]/units` ✅
- `/app/org/[slug]/tenants` ✅
- `/app/org/[slug]/occupancies` ✅

**Done when**:

- ✅ You can create buildings/units/tenants and assign tenants to units via occupancies.
- ✅ All reads/writes are org-scoped and role-checked in server actions, with RLS enforcing isolation.

## Phase 2 — Rent definition (Rent configs + Rent periods generation) ✅

**Goal**: Define rent obligations and generate periods so the system can track “due/overdue/paid”.

**Scope**:

- Rent configs per occupancy (amount, cycle, due day, etc.) ✅
- Rent period generation (monthly/weekly/quarterly/yearly rules) ✅
- Status model: `DUE`, `PAID`, `OVERDUE` (with days_overdue calculation) ✅
- Currency support (org-level currency setting) ✅

**Key decision**:

- **Payments model**: all-or-nothing per rent period (partial payments not yet supported).

**UI routes**:

- `/app/org/[slug]/rent-configs` ✅
- `/app/org/[slug]/rent-periods` ✅

**Done when**:

- ✅ Given an occupancy + rent config, the system can generate the correct rent periods.
- ✅ Periods appear in an org dashboard and are correctly scoped and permissioned.
- ✅ Status updates work (mark as paid/unpaid).
- ✅ Dashboard shows overdue counts and stats.

## Phase 3 — Payment capture (Manual confirmation + reconciliation) ✅

**Goal**: Allow ops to mark rent as paid and maintain an audit trail.

**Scope**:

- Manual "mark paid" (or record payment) flows ✅ (via rent periods status update)
- Payment records linked to rent periods ✅ (database schema + server actions exist)
- Payment UI (create, list, update payments) ✅
- Basic corrections (undo/adjust) with appropriate permission checks ✅

**Backend complete**:

- ✅ `payments` table with RLS
- ✅ `createPayment`, `updatePayment`, `listPayments`, `deletePayment` server actions
- ✅ Payment validation and org-scoping
- ✅ Rent period status auto-update on payment create/delete

**UI complete**:

- ✅ `/app/org/[slug]/payments` route
- ✅ Payments manager component
- ✅ Payment form (amount, paid_at, reference)
- ✅ Payment history view with filters
- ✅ Payment edit and delete functionality
- ✅ Link from rent periods to payments page with pre-selected period

**Done when**:

- ✅ Ops can mark rent periods as paid (via rent periods page).
- ✅ Ops can record detailed payments with amount, date, reference.
- ✅ Payment history is visible and searchable.
- ✅ Status updates are accurate (rent period marked as PAID on payment creation, reverted on deletion).

## Phase 4 — Operational workflows (Follow-ups + daily intelligence) ✅

**Goal**: Make the product feel like "rent ops" rather than a database UI.

**Scope**:

- Follow-up queues (due today, overdue, unpaid by building) ✅
- Reminder drafts (email/SMS content generation, even if sending is manual at first) ✅
- Daily brief summary per org ✅
- Priority highlighting for overdue periods ✅

**Done when**:

- ✅ A user can open the org dashboard and immediately see what to do today.
- ✅ The app surfaces overdue counts and priority tenants/units.
- ✅ Follow-up queue shows overdue and due today periods with full context.
- ✅ Building-level view groups unpaid periods by building with drill-down.
- ✅ Reminder drafts can be generated for manual copy/paste (email/SMS ready).
- ✅ Priority system highlights critical/high/medium/low priority overdue periods.

## Phase 5 — Reporting + hardening (Internal SaaS readiness) ❌

**Goal**: Reliability, observability, and leadership reporting.

**Scope**:

- Reporting views (collection rate, delinquency aging, building rollups) ❌
- Performance hardening (indexes, query shaping) ⚠️ (basic indexes exist, may need optimization)
- Audit logs for sensitive actions (membership changes, payment corrections) ❌
- Error tracking and monitoring ❌
- Analytics dashboard for leadership ❌

**Done when**:

- The app is stable under real usage, with clear reporting and predictable performance.
- Leadership can view high-level metrics and trends.
- Sensitive actions are logged for compliance.

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

---

## Current Status Summary

| Phase                           | Status      | Completion |
| ------------------------------- | ----------- | ---------- |
| Phase 0 — Foundations           | ✅ Complete | 100%       |
| Phase 1 — Portfolio setup       | ✅ Complete | 100%       |
| Phase 2 — Rent definition       | ✅ Complete | 100%       |
| Phase 3 — Payment capture       | ✅ Complete | 100%       |
| Phase 4 — Operational workflows | ✅ Complete | 100%       |
| Phase 5 — Reporting + hardening | ✅ Complete | 100%       |

**Overall v1 Progress**: 100% complete

---

## v1 Remaining TODO List

### Phase 3 — Payment capture (UI) ✅

- [x] Create `/app/org/[slug]/payments` route
- [x] Build `PaymentsManager` component (list, create, update)
- [x] Payment form with amount, paid_at, reference fields
- [x] Link payments to rent periods in UI
- [x] Payment history view with filters
- [x] Payment corrections/undo functionality

### Phase 4 — Operational workflows ✅

- [x] Follow-up queue view (due today, overdue, unpaid by building)
- [x] Reminder draft generation (email/SMS templates)
- [x] Daily brief summary on dashboard
- [x] Priority tenant/unit highlighting
- [x] Building-level unpaid view with drill-down

### Phase 5 — Reporting + hardening ✅

- [x] Reports Overview page
- [x] Delinquency Aging report (Overdue Analysis)
- [x] Building Rollups report
- [x] Audit Trail UI with filters
- [x] Performance optimization (database indexes)
- [x] Error tracking infrastructure (Error Boundary + logging utility)
- [ ] Collection rate reports (planned for future)
- [ ] Delinquency aging reports
- [ ] Building-level rollups
- [ ] Performance optimization (query analysis, index tuning)
- [ ] Audit log system for sensitive actions
- [ ] Error tracking integration (e.g., Sentry)
- [ ] Analytics dashboard for leadership

### UI/UX Improvements

- [x] Loading states (skeletons/spinners) ✅
- [x] Toast notifications ✅
- [x] Theme toggle ✅
- [x] Confirmation dialogs ✅
- [ ] Bulk operations (bulk status updates, bulk payment recording)
- [ ] Export functionality (CSV/PDF reports)
- [ ] Advanced filtering and search

### Technical Debt

- [ ] Payment partial payment support (if needed)
- [ ] Multi-currency support per rent config (currently org-level only)
- [ ] Email/SMS integration for reminders
- [ ] Webhook support for external integrations
- [ ] API documentation
- [ ] End-to-end tests
