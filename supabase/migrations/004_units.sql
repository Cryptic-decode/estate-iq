-- Units table (Phase 1)
-- Owns all unit-level data for an organization, linked to a building.

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_units_organization_id ON units(organization_id);
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_org_building ON units(organization_id, building_id);

-- Trigger function: Validate building belongs to same org
CREATE OR REPLACE FUNCTION validate_unit_building_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM buildings
    WHERE buildings.id = NEW.building_id
      AND buildings.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Building must belong to the same organization as the unit';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate building-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_unit_building_org_trigger ON units;
CREATE TRIGGER validate_unit_building_org_trigger
  BEFORE INSERT OR UPDATE ON units
  FOR EACH ROW
  EXECUTE FUNCTION validate_unit_building_org();

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view units in their organizations" ON units;
CREATE POLICY "Users can view units in their organizations"
  ON units
  FOR SELECT
  USING (is_org_member(units.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert units in their organizations" ON units;
CREATE POLICY "Ops can insert units in their organizations"
  ON units
  FOR INSERT
  WITH CHECK (
    is_org_member(units.organization_id, auth.uid())
    AND get_user_org_role(units.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update units in their organizations" ON units;
CREATE POLICY "Ops can update units in their organizations"
  ON units
  FOR UPDATE
  USING (
    is_org_member(units.organization_id, auth.uid())
    AND get_user_org_role(units.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete units in their organizations" ON units;
CREATE POLICY "Owners can delete units in their organizations"
  ON units
  FOR DELETE
  USING (
    is_org_member(units.organization_id, auth.uid())
    AND get_user_org_role(units.organization_id, auth.uid()) = 'OWNER'
  );

