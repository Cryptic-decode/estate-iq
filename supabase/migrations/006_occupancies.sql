-- Occupancies table (Phase 1)
-- Links a tenant to a unit for a period of time (lease/occupancy assignment).

CREATE TABLE IF NOT EXISTS occupancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  active_from DATE NOT NULL,
  active_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT occupancies_active_range_check CHECK (active_to IS NULL OR active_to >= active_from)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_occupancies_organization_id ON occupancies(organization_id);
CREATE INDEX IF NOT EXISTS idx_occupancies_unit_id ON occupancies(unit_id);
CREATE INDEX IF NOT EXISTS idx_occupancies_tenant_id ON occupancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_occupancies_org_unit ON occupancies(organization_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_occupancies_org_tenant ON occupancies(organization_id, tenant_id);

-- Trigger function: Validate unit + tenant belong to same org as occupancy
CREATE OR REPLACE FUNCTION validate_occupancy_refs_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM units
    WHERE units.id = NEW.unit_id
      AND units.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Unit must belong to the same organization as the occupancy';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tenants
    WHERE tenants.id = NEW.tenant_id
      AND tenants.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Tenant must belong to the same organization as the occupancy';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate org references before insert/update
DROP TRIGGER IF EXISTS validate_occupancy_refs_org_trigger ON occupancies;
CREATE TRIGGER validate_occupancy_refs_org_trigger
  BEFORE INSERT OR UPDATE ON occupancies
  FOR EACH ROW
  EXECUTE FUNCTION validate_occupancy_refs_org();

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_occupancies_updated_at ON occupancies;
CREATE TRIGGER update_occupancies_updated_at
  BEFORE UPDATE ON occupancies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE occupancies ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view occupancies in their organizations" ON occupancies;
CREATE POLICY "Users can view occupancies in their organizations"
  ON occupancies
  FOR SELECT
  USING (is_org_member(occupancies.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert occupancies in their organizations" ON occupancies;
CREATE POLICY "Ops can insert occupancies in their organizations"
  ON occupancies
  FOR INSERT
  WITH CHECK (
    is_org_member(occupancies.organization_id, auth.uid())
    AND get_user_org_role(occupancies.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update occupancies in their organizations" ON occupancies;
CREATE POLICY "Ops can update occupancies in their organizations"
  ON occupancies
  FOR UPDATE
  USING (
    is_org_member(occupancies.organization_id, auth.uid())
    AND get_user_org_role(occupancies.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete occupancies in their organizations" ON occupancies;
CREATE POLICY "Owners can delete occupancies in their organizations"
  ON occupancies
  FOR DELETE
  USING (
    is_org_member(occupancies.organization_id, auth.uid())
    AND get_user_org_role(occupancies.organization_id, auth.uid()) = 'OWNER'
  );


