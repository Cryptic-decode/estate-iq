-- Tenants table (Phase 1)
-- Owns all tenant-level data for an organization.

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_org_email ON tenants(organization_id, email) WHERE email IS NOT NULL;

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view tenants in their organizations" ON tenants;
CREATE POLICY "Users can view tenants in their organizations"
  ON tenants
  FOR SELECT
  USING (is_org_member(tenants.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert tenants in their organizations" ON tenants;
CREATE POLICY "Ops can insert tenants in their organizations"
  ON tenants
  FOR INSERT
  WITH CHECK (
    is_org_member(tenants.organization_id, auth.uid())
    AND get_user_org_role(tenants.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update tenants in their organizations" ON tenants;
CREATE POLICY "Ops can update tenants in their organizations"
  ON tenants
  FOR UPDATE
  USING (
    is_org_member(tenants.organization_id, auth.uid())
    AND get_user_org_role(tenants.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete tenants in their organizations" ON tenants;
CREATE POLICY "Owners can delete tenants in their organizations"
  ON tenants
  FOR DELETE
  USING (
    is_org_member(tenants.organization_id, auth.uid())
    AND get_user_org_role(tenants.organization_id, auth.uid()) = 'OWNER'
  );

