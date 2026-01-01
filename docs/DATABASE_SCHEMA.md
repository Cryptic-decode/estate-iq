# Database Schema Documentation

This document describes the EstateIQ v1 database schema for multi-tenant SaaS.

## Overview

EstateIQ uses a **single database, shared schema** approach with Row Level Security (RLS) for multi-tenancy. Every business record is owned by exactly one `Organization` via `orgId`.

## Core Tables

### `organizations`

Represents a customer company (estate management company).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | TEXT | NOT NULL | Company name |
| `slug` | TEXT | UNIQUE, NOT NULL | URL-friendly identifier (e.g., "acme-estates") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_organizations_slug` on `slug` (for fast lookups)

### `memberships`

Join table linking users to organizations with roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, FK → auth.users | Supabase auth user ID |
| `organization_id` | UUID | NOT NULL, FK → organizations | Organization ID |
| `role` | TEXT | NOT NULL, CHECK | Role: OWNER, MANAGER, OPS, DIRECTOR |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Constraints:**
- `UNIQUE(user_id, organization_id)` - User can only have one membership per org
- `CHECK (role IN ('OWNER', 'MANAGER', 'OPS', 'DIRECTOR'))` - Valid roles only

**Indexes:**
- `idx_memberships_user_id` on `user_id`
- `idx_memberships_organization_id` on `organization_id`
- `idx_memberships_user_org` on `(user_id, organization_id)`

## Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access, billing/admin, can manage memberships |
| **MANAGER** | Full rent operations access (create/update) |
| **OPS** | Day-to-day operations access (create/update) |
| **DIRECTOR** | Read-only dashboards/reports |

## Row Level Security (RLS)

RLS is enabled on all tables to enforce org isolation at the database level.

### Organizations Policies

- **SELECT**: Users can only see organizations they are members of
- **INSERT**: Users can create organizations (for onboarding)
- **UPDATE**: Only OWNER role can update organizations
- **DELETE**: Only OWNER role can delete organizations

### Memberships Policies

- **SELECT**: Users can view memberships for organizations they belong to
- **INSERT**: 
  - Users can create their own OWNER membership (onboarding)
  - Only OWNER role can create other memberships
- **UPDATE**: Only OWNER role can update memberships (role changes)
- **DELETE**: Only OWNER role can delete memberships

## Helper Functions

### `is_org_member(org_id UUID, user_uuid UUID) → BOOLEAN`

Checks if a user is a member of an organization.

```sql
SELECT is_org_member('org-uuid', auth.uid());
```

### `get_user_org_role(org_id UUID, user_uuid UUID) → TEXT`

Returns the user's role in an organization (or NULL if not a member).

```sql
SELECT get_user_org_role('org-uuid', auth.uid());
```

## Data Isolation Rules

**Non-negotiable:**

1. Every query must be scoped by `orgId` (or filtered via membership)
2. Every write must set `orgId` from authenticated org context (never from client input)
3. IDs from other orgs must be treated as **not found** (avoid information leakage)

## Future Tables (Phase 1+)

All future domain tables will follow this pattern:

```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- ... other fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policy example
CREATE POLICY "Users can only access their org's buildings"
  ON buildings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM memberships
      WHERE memberships.organization_id = buildings.organization_id
        AND memberships.user_id = auth.uid()
    )
  );
```

## Migration Files

See `supabase/migrations/` directory for SQL migration files.

## Notes

- All tables use UUID primary keys for better distribution and security
- `updated_at` is automatically maintained via triggers
- RLS policies enforce org isolation at the database level
- Helper functions use `SECURITY DEFINER` for controlled access

