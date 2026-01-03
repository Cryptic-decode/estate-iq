-- Payments table (Phase 1)
-- Records manual payment confirmations for rent periods.

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rent_period_id UUID NOT NULL REFERENCES rent_periods(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_amount_check CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_rent_period_id ON payments(rent_period_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_org_period ON payments(organization_id, rent_period_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_paid_at ON payments(organization_id, paid_at);

-- Trigger function: Validate rent_period belongs to same org
CREATE OR REPLACE FUNCTION validate_payment_period_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM rent_periods
    WHERE rent_periods.id = NEW.rent_period_id
      AND rent_periods.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rent period must belong to the same organization as the payment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate rent_period-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_payment_period_org_trigger ON payments;
CREATE TRIGGER validate_payment_period_org_trigger
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_period_org();

-- Keep updated_at current (function defined in 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR)
DROP POLICY IF EXISTS "Users can view payments in their organizations" ON payments;
CREATE POLICY "Users can view payments in their organizations"
  ON payments
  FOR SELECT
  USING (is_org_member(payments.organization_id, auth.uid()));

-- Write: OWNER / MANAGER / OPS
DROP POLICY IF EXISTS "Ops can insert payments in their organizations" ON payments;
CREATE POLICY "Ops can insert payments in their organizations"
  ON payments
  FOR INSERT
  WITH CHECK (
    is_org_member(payments.organization_id, auth.uid())
    AND get_user_org_role(payments.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Ops can update payments in their organizations" ON payments;
CREATE POLICY "Ops can update payments in their organizations"
  ON payments
  FOR UPDATE
  USING (
    is_org_member(payments.organization_id, auth.uid())
    AND get_user_org_role(payments.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

DROP POLICY IF EXISTS "Owners can delete payments in their organizations" ON payments;
CREATE POLICY "Owners can delete payments in their organizations"
  ON payments
  FOR DELETE
  USING (
    is_org_member(payments.organization_id, auth.uid())
    AND get_user_org_role(payments.organization_id, auth.uid()) = 'OWNER'
  );

