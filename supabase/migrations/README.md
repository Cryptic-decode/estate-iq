# Supabase Migrations

This directory contains SQL migration files for the EstateIQ database schema.

## Migration Files

1. **001_initial_schema.sql**: Creates core multi-tenancy tables (`organizations`, `memberships`) with indexes and triggers.

2. **002_enable_rls.sql**: Enables Row Level Security (RLS) and creates policies for org isolation.

3. **010_fix_memberships_rls_recursion.sql**: Fixes a self-referential RLS policy issue on `memberships` that can cause “Error fetching memberships” at runtime.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for Development)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of each migration file in order
4. Run each migration sequentially

### Option 2: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 3: Direct SQL Execution

You can also run these migrations directly in your Supabase SQL editor or via psql.

## Migration Order

**Important**: Run migrations in numerical order:

1. `001_initial_schema.sql` (must run first)
2. `002_enable_rls.sql` (depends on tables from 001)
3. `010_fix_memberships_rls_recursion.sql` (recommended if you hit membership fetch errors)

## Verification

After applying migrations, verify:

1. Tables exist: `organizations`, `memberships`
2. RLS is enabled: Check in Supabase dashboard → Table Editor → Settings
3. Policies exist: Check in Supabase dashboard → Authentication → Policies
4. Indexes exist: Check in Supabase dashboard → Database → Indexes

## Notes

- All tables use UUID primary keys
- `updated_at` is automatically maintained via triggers
- RLS policies enforce org isolation at the database level
- Helper functions (`is_org_member`, `get_user_org_role`) are available for use in future migrations

