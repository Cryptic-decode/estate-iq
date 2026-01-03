-- Rent Periods table (Phase 1)
-- Tracks individual rent periods (e.g., "January 2024 rent") with status and overdue tracking.

CREATE TABLE IF NOT EXISTS rent_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rent_config_id UUID NOT NULL REFERENCES rent_configs(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DUE',
  days_overdue INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rent_periods_status_check CHECK (status IN ('DUE', 'PAID', 'OVERDUE')),
  CONSTRAINT rent_periods_date_range_check CHECK (period_end >= period_start),
  CONSTRAINT rent_periods_days_overdue_check CHECK (days_overdue >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rent_periods_organization_id ON rent_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_rent_periods_rent_config_id ON rent_periods(rent_config_id);
CREATE INDEX IF NOT EXISTS idx_rent_periods_status ON rent_periods(status);
CREATE INDEX IF NOT EXISTS idx_rent_periods_due_date ON rent_periods(due_date);
CREATE INDEX IF NOT EXISTS idx_rent_periods_org_status ON rent_periods(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rent_periods_org_overdue ON rent_periods(organization_id, days_overdue) WHERE days_overdue > 0;

-- Trigger function: Validate rent_config belongs to same org
CREATE OR REPLACE FUNCTION validate_rent_period_config_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM rent_configs
    WHERE rent_configs.id = NEW.rent_config_id
      AND rent_configs.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rent config must belong to the same organization as the rent period';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: Calculate days_overdue based on status and due_date
CREATE OR REPLACE FUNCTION calculate_rent_period_days_overdue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'PAID' THEN
    NEW.days_overdue := 0;
  ELSIF NEW.status IN ('DUE', 'OVERDUE') THEN
    -- Calculate days overdue: max(0, current_date - due_date)
    NEW.days_overdue := GREATEST(0, CURRENT_DATE - NEW.due_date);
    -- Auto-update status to OVERDUE if past due date
    IF NEW.days_overdue > 0 AND NEW.status = 'DUE' THEN
      NEW.status := 'OVERDUE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate rent_config-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_rent_period_config_org_trigger ON rent_periods;
CREATE TRIGGER validate_rent_period_config_org_trigger
  BEFORE INSERT OR UPDATE ON rent_periods
  FOR EACH ROW
  EXECUTE FUNCTION validate_rent_period_config_org();

-- Trigger: Calculate days_overdue before insert/update
DROP TRIGGER IF EXISTS calculate_rent_period_days_overdue_trigger ON rent_periods;
CREATE TRIGGER calculate_rent_period_days_overdue_trigger
  BEFORE INSERT OR UPDATE ON rent_periods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_rent_period_days_overdue();

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_rent_periods_updated_at ON rent_periods;
CREATE TRIGGER update_rent_periods_updated_at
  BEFORE UPDATE ON rent_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE rent_periods ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view rent_periods in their organizations" ON rent_periods;
CREATE POLICY "Users can view rent_periods in their organizations"
  ON rent_periods
  FOR SELECT
  USING (is_org_member(rent_periods.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert rent_periods in their organizations" ON rent_periods;
CREATE POLICY "Ops can insert rent_periods in their organizations"
  ON rent_periods
  FOR INSERT
  WITH CHECK (
    is_org_member(rent_periods.organization_id, auth.uid())
    AND get_user_org_role(rent_periods.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update rent_periods in their organizations" ON rent_periods;
CREATE POLICY "Ops can update rent_periods in their organizations"
  ON rent_periods
  FOR UPDATE
  USING (
    is_org_member(rent_periods.organization_id, auth.uid())
    AND get_user_org_role(rent_periods.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete rent_periods in their organizations" ON rent_periods;
CREATE POLICY "Owners can delete rent_periods in their organizations"
  ON rent_periods
  FOR DELETE
  USING (
    is_org_member(rent_periods.organization_id, auth.uid())
    AND get_user_org_role(rent_periods.organization_id, auth.uid()) = 'OWNER'
  );

