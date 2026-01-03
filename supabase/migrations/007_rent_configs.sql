-- Rent Configs table (Phase 1)
-- Defines rent amount, cycle, and due day for an occupancy.

CREATE TABLE IF NOT EXISTS rent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  occupancy_id UUID NOT NULL REFERENCES occupancies(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  cycle TEXT NOT NULL,
  due_day INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rent_configs_amount_check CHECK (amount > 0),
  CONSTRAINT rent_configs_cycle_check CHECK (cycle IN ('MONTHLY', 'WEEKLY', 'QUARTERLY', 'YEARLY')),
  CONSTRAINT rent_configs_due_day_check CHECK (due_day >= 1 AND due_day <= 31)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_configs_organization_id ON rent_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_rent_configs_occupancy_id ON rent_configs(occupancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_configs_org_occupancy ON rent_configs(organization_id, occupancy_id);

-- Trigger function: Validate occupancy belongs to same org
CREATE OR REPLACE FUNCTION validate_rent_config_occupancy_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM occupancies
    WHERE occupancies.id = NEW.occupancy_id
      AND occupancies.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Occupancy must belong to the same organization as the rent config';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate occupancy-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_rent_config_occupancy_org_trigger ON rent_configs;
CREATE TRIGGER validate_rent_config_occupancy_org_trigger
  BEFORE INSERT OR UPDATE ON rent_configs
  FOR EACH ROW
  EXECUTE FUNCTION validate_rent_config_occupancy_org();

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_rent_configs_updated_at ON rent_configs;
CREATE TRIGGER update_rent_configs_updated_at
  BEFORE UPDATE ON rent_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE rent_configs ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view rent_configs in their organizations" ON rent_configs;
CREATE POLICY "Users can view rent_configs in their organizations"
  ON rent_configs
  FOR SELECT
  USING (is_org_member(rent_configs.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert rent_configs in their organizations" ON rent_configs;
CREATE POLICY "Ops can insert rent_configs in their organizations"
  ON rent_configs
  FOR INSERT
  WITH CHECK (
    is_org_member(rent_configs.organization_id, auth.uid())
    AND get_user_org_role(rent_configs.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update rent_configs in their organizations" ON rent_configs;
CREATE POLICY "Ops can update rent_configs in their organizations"
  ON rent_configs
  FOR UPDATE
  USING (
    is_org_member(rent_configs.organization_id, auth.uid())
    AND get_user_org_role(rent_configs.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete rent_configs in their organizations" ON rent_configs;
CREATE POLICY "Owners can delete rent_configs in their organizations"
  ON rent_configs
  FOR DELETE
  USING (
    is_org_member(rent_configs.organization_id, auth.uid())
    AND get_user_org_role(rent_configs.organization_id, auth.uid()) = 'OWNER'
  );

