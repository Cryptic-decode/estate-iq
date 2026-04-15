-- Reminder Sends table (Phase 7)
-- Tracks email/SMS reminders sent to tenants for rent periods.
-- Records who, what, when, channel, and delivery status.

CREATE TABLE IF NOT EXISTS reminder_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rent_period_id UUID NOT NULL REFERENCES rent_periods(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'friendly',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reminder_sends_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT reminder_sends_status_check CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
  CONSTRAINT reminder_sends_tone_check CHECK (tone IN ('friendly', 'formal', 'urgent'))
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_reminder_sends_organization_id ON reminder_sends(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_rent_period_id ON reminder_sends(rent_period_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_tenant_id ON reminder_sends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_user_id ON reminder_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_status ON reminder_sends(status);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_channel ON reminder_sends(channel);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_sent_at ON reminder_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_org_period ON reminder_sends(organization_id, rent_period_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_org_tenant ON reminder_sends(organization_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_sends_org_created_at ON reminder_sends(organization_id, created_at DESC);

-- Trigger function: Validate rent_period belongs to same org
CREATE OR REPLACE FUNCTION validate_reminder_period_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM rent_periods
    WHERE rent_periods.id = NEW.rent_period_id
      AND rent_periods.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Rent period must belong to the same organization as the reminder';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate rent_period-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_reminder_period_org_trigger ON reminder_sends;
CREATE TRIGGER validate_reminder_period_org_trigger
  BEFORE INSERT OR UPDATE ON reminder_sends
  FOR EACH ROW
  EXECUTE FUNCTION validate_reminder_period_org();

-- Trigger function: Validate tenant belongs to same org
CREATE OR REPLACE FUNCTION validate_reminder_tenant_org()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM tenants
    WHERE tenants.id = NEW.tenant_id
      AND tenants.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Tenant must belong to the same organization as the reminder';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Validate tenant-org relationship before insert/update
DROP TRIGGER IF EXISTS validate_reminder_tenant_org_trigger ON reminder_sends;
CREATE TRIGGER validate_reminder_tenant_org_trigger
  BEFORE INSERT OR UPDATE ON reminder_sends
  FOR EACH ROW
  EXECUTE FUNCTION validate_reminder_tenant_org();

-- RLS
ALTER TABLE reminder_sends ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR) can view reminder sends for their org
DROP POLICY IF EXISTS "Users can view reminder sends in their organizations" ON reminder_sends;
CREATE POLICY "Users can view reminder sends in their organizations"
  ON reminder_sends
  FOR SELECT
  USING (is_org_member(reminder_sends.organization_id, auth.uid()));

-- Write: Authenticated org members with OWNER, MANAGER, or OPS role can insert reminder sends
-- Server actions verify user authentication and org membership before calling sendReminder
DROP POLICY IF EXISTS "Org members can insert reminder sends" ON reminder_sends;
CREATE POLICY "Org members can insert reminder sends"
  ON reminder_sends
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_org_member(reminder_sends.organization_id, auth.uid())
    AND get_user_org_role(reminder_sends.organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

-- Update: Only OWNER or MANAGER can update reminder sends (e.g., to mark as delivered/bounced)
DROP POLICY IF EXISTS "Owners and managers can update reminder sends" ON reminder_sends;
CREATE POLICY "Owners and managers can update reminder sends"
  ON reminder_sends
  FOR UPDATE
  USING (
    is_org_member(reminder_sends.organization_id, auth.uid())
    AND get_user_org_role(reminder_sends.organization_id, auth.uid()) IN ('OWNER', 'MANAGER')
  )
  WITH CHECK (
    is_org_member(reminder_sends.organization_id, auth.uid())
    AND get_user_org_role(reminder_sends.organization_id, auth.uid()) IN ('OWNER', 'MANAGER')
  );

-- Note: Reminder sends are typically append-only. Deletes are not allowed via RLS.
-- If a correction is needed, create a new reminder send entry.

