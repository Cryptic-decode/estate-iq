## EstateIQ v1 – Rent Intelligence Platform

**Know the state of your rent. Always.**

EstateIQ v1 is an internal **multi-company SaaS** for real estate companies to track rent status, coordinate follow-ups, and keep leadership informed.

## Scope (v1)

- **In scope**: orgs + roles, portfolio records, rent schedules and periods, manual payment confirmation, operational follow-ups, reporting, and tracked email reminders.
- **Out of scope**: payment processing, tenant portal, SMS/WhatsApp automation, accounting, and mobile apps. Maintenance remains outside the agreed v1 scope until its workflows are defined.

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
- `RESEND_API_KEY` (server-only)
- `RESEND_FROM_EMAIL` (verified sender address)

## Database migrations (Supabase)

Migrations live in `supabase/migrations/`.

### Apply via Supabase Dashboard (recommended for development)

Supabase → **SQL Editor** → run the numbered migration files in ascending order.

Notes:

- `004_units.sql`, `006_occupancies.sql`, `007_rent_configs.sql`, `008_rent_periods.sql`, `009_payments.sql` include validation triggers to prevent cross-org references.

## Key routes

- **Landing**: `/`
- **Auth**: `/signin`, `/signup`
- **App entry**: `/app` (redirects to onboarding or the first org)
- **Onboarding**: `/app/onboarding`
- **Org dashboard**: `/app/org/[slug]`
- **Reminder history**: `/app/org/[slug]/reminders`

## Docs

- `docs/DESIGN_GUIDELINES.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/saas-multi-tenancy.md`
- `docs/DEVELOPMENT_PHASES.md`
- `docs/END_TO_END_FLOW.md`
- `docs/EMAIL_TEMPLATES.md`
