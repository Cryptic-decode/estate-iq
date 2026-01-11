-- Audit Logs table (Phase 5)
-- Tracks sensitive actions for compliance and accountability.
-- Records who, what, when, and before/after values for critical operations.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_action_type_check CHECK (
    action_type IN (
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_DELETED',
      'RENT_PERIOD_STATUS_CHANGED',
      'ORGANIZATION_CURRENCY_UPDATED',
      'MEMBERSHIP_ROLE_CHANGED',
      'MEMBERSHIP_CREATED',
      'MEMBERSHIP_DELETED'
    )
  ),
  CONSTRAINT audit_logs_entity_type_check CHECK (
    entity_type IN (
      'payment',
      'rent_period',
      'organization',
      'membership'
    )
  )
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created_at ON audit_logs(organization_id, created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Read: any org member (incl DIRECTOR) can view audit logs for their org
DROP POLICY IF EXISTS "Users can view audit logs in their organizations" ON audit_logs;
CREATE POLICY "Users can view audit logs in their organizations"
  ON audit_logs
  FOR SELECT
  USING (is_org_member(audit_logs.organization_id, auth.uid()));

-- Write: Authenticated org members can insert audit logs (via server actions)
-- Server actions verify user authentication and org membership before calling createAuditLog
DROP POLICY IF EXISTS "Org members can insert audit logs" ON audit_logs;
CREATE POLICY "Org members can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_org_member(audit_logs.organization_id, auth.uid())
  );

-- Note: Audit logs are append-only. Updates and deletes are not allowed.
-- If a correction is needed, create a new audit log entry explaining the correction.

