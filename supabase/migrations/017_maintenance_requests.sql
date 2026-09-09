-- Tenant account foundation and maintenance requests.
-- Tenant accounts are linked explicitly by staff/invite flows; users never self-select a unit.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_org_user
  ON tenants(organization_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION is_linked_tenant(tenant_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = tenant_uuid
      AND tenants.user_id = user_uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tenant_has_unit_access(unit_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM occupancies
    JOIN tenants ON tenants.id = occupancies.tenant_id
    WHERE occupancies.unit_id = unit_uuid
      AND tenants.user_id = user_uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION tenant_has_building_access(building_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM occupancies
    JOIN tenants ON tenants.id = occupancies.tenant_id
    JOIN units ON units.id = occupancies.unit_id
    WHERE units.building_id = building_uuid
      AND tenants.user_id = user_uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  occupancy_id UUID NOT NULL REFERENCES occupancies(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_requests_category_check CHECK (
    category IN ('PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'OTHER')
  ),
  CONSTRAINT maintenance_requests_priority_check CHECK (
    priority IN ('LOW', 'NORMAL', 'HIGH', 'EMERGENCY')
  ),
  CONSTRAINT maintenance_requests_status_check CHECK (
    status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED')
  )
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_org_status
  ON maintenance_requests(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant
  ON maintenance_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_occupancy
  ON maintenance_requests(occupancy_id, created_at DESC);

DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
CREATE TRIGGER update_maintenance_requests_updated_at
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Linked tenants can view their maintenance requests"
  ON maintenance_requests FOR SELECT
  USING (is_linked_tenant(tenant_id, auth.uid()));

CREATE POLICY "Staff can create maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    is_org_member(organization_id, auth.uid())
    AND get_user_org_role(organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

CREATE POLICY "Linked tenants can create maintenance requests"
  ON maintenance_requests FOR INSERT
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND is_linked_tenant(tenant_id, auth.uid())
  );

CREATE POLICY "Staff can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  USING (
    is_org_member(organization_id, auth.uid())
    AND get_user_org_role(organization_id, auth.uid()) IN ('OWNER', 'MANAGER', 'OPS')
  );

CREATE POLICY "Owners can delete maintenance requests"
  ON maintenance_requests FOR DELETE
  USING (
    is_org_member(organization_id, auth.uid())
    AND get_user_org_role(organization_id, auth.uid()) = 'OWNER'
  );

CREATE POLICY "Linked tenants can view their tenant profile"
  ON tenants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Linked tenants can view their occupancies"
  ON occupancies FOR SELECT
  USING (is_linked_tenant(tenant_id, auth.uid()));

CREATE POLICY "Linked tenants can view their units"
  ON units FOR SELECT
  USING (tenant_has_unit_access(id, auth.uid()));

CREATE POLICY "Linked tenants can view their buildings"
  ON buildings FOR SELECT
  USING (tenant_has_building_access(id, auth.uid()));

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check CHECK (
  action_type IN (
    'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_DELETED',
    'RENT_PERIOD_STATUS_CHANGED', 'ORGANIZATION_CURRENCY_UPDATED',
    'MEMBERSHIP_ROLE_CHANGED', 'MEMBERSHIP_CREATED', 'MEMBERSHIP_DELETED',
    'MAINTENANCE_REQUEST_CREATED', 'MAINTENANCE_REQUEST_STATUS_CHANGED',
    'MAINTENANCE_REQUEST_DELETED'
  )
);

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_check CHECK (
  entity_type IN ('payment', 'rent_period', 'organization', 'membership', 'maintenance_request')
);
