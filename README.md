## EstateIQ v1 – Rent Intelligence Platform

**Know the state of your rent. Always.**

EstateIQ v1 is an internal **multi-company SaaS** for real estate companies to track rent status, coordinate follow-ups, and keep leadership informed.

## Scope (v1)

- **In scope**: orgs + roles, buildings, units, tenants, occupancy/lease assignment, rent config, rent periods + status, manual payment confirmation.
- **Out of scope**: payment processing, tenant portal, WhatsApp automation, accounting, maintenance, mobile apps.

## Multi-tenancy (non-negotiable)

- Every domain row is owned by exactly one `organization_id`.
- Access is granted via `memberships` (role-based).
- All queries/writes must be org-scoped (and enforced via Supabase RLS).

See `docs/saas-multi-tenancy.md`.

## Tech stack

- **Next.js (App Router)**
- **Supabase** (Auth + Postgres + RLS)
- **Tailwind CSS** + **Framer Motion**

## Local development

From `estate-iq/`:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env.local` with your Supabase project values (see Supabase dashboard):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## Database migrations (Supabase)

Migrations live in `supabase/migrations/`.

### Apply via Supabase Dashboard (recommended for development)

Supabase → **SQL Editor** → run files in order:

1. `001_initial_schema.sql`
2. `002_enable_rls.sql`
3. `003_buildings.sql`
4. `004_units.sql`
5. `005_tenants.sql`
6. `006_occupancies.sql`
7. `007_rent_configs.sql`
8. `008_rent_periods.sql`
9. `009_payments.sql`

Notes:

- `004_units.sql`, `006_occupancies.sql`, `007_rent_configs.sql`, `008_rent_periods.sql`, `009_payments.sql` include validation triggers to prevent cross-org references.

## Key routes

- **Landing**: `/`
- **Auth**: `/signin`, `/signup`
- **App entry**: `/app` (redirects to onboarding or the first org)
- **Onboarding**: `/app/onboarding`
- **Org dashboard**: `/app/org/[slug]`

## Docs

- `docs/DESIGN_GUIDELINES.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/saas-multi-tenancy.md`
- `docs/DEVELOPMENT_PHASES.md`
- `docs/END_TO_END_FLOW.md`
- `docs/EMAIL_TEMPLATES.md`
