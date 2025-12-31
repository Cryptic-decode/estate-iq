## EstateIQ v1 – Rent Intelligence Platform

**Know the state of your rent. Always.**

EstateIQ v1 is a **multi-company SaaS** rent intelligence + reminder system for real estate companies managing multiple tenants across multiple buildings.

### Scope (v1)

- **In scope**: companies/orgs, users/roles, buildings, units, tenant assignment, rent configuration, rent periods/status, manual payment confirmation, reminder drafts (review-before-send), daily rent intelligence brief, basic reports.
- **Out of scope**: payments processing, tenant portal, WhatsApp automation, accounting, maintenance, mobile apps.

### Multi-tenancy (important)

All data is owned by an `Organization` (company). Users access an org via `Membership` (role-based).

See `docs/saas-multi-tenancy.md`.

## Getting Started

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
