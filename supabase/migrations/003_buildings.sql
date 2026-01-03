-- Buildings table (Phase 1)
-- Owns all building-level data for an organization.

CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buildings_organization_id ON buildings(organization_id);
CREATE INDEX IF NOT EXISTS idx_buildings_org_name ON buildings(organization_id, name);

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_buildings_updated_at ON buildings;
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view buildings in their organizations" ON buildings;
CREATE POLICY "Users can view buildings in their organizations"
  ON buildings
  FOR SELECT
  USING (is_org_member(buildings.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert buildings in their organizations" ON buildings;
CREATE POLICY "Ops can insert buildings in their organizations"
  ON buildings
  FOR INSERT
  WITH CHECK (
    is_org_member(buildings.organization_id, auth.uid())
    AND get_user_org_role(buildings.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update buildings in their organizations" ON buildings;
CREATE POLICY "Ops can update buildings in their organizations"
  ON buildings
  FOR UPDATE
  USING (
    is_org_member(buildings.organization_id, auth.uid())
    AND get_user_org_role(buildings.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete buildings in their organizations" ON buildings;
CREATE POLICY "Owners can delete buildings in their organizations"
  ON buildings
  FOR DELETE
  USING (
    is_org_member(buildings.organization_id, auth.uid())
    AND get_user_org_role(buildings.organization_id, auth.uid()) = 'OWNER'
  );


