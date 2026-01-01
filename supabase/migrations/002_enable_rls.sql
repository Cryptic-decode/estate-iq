-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is a member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM memberships
    WHERE organization_id = org_id
      AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user's role in an organization
CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID, user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM memberships
    WHERE organization_id = org_id
      AND user_id = user_uuid
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for organizations
-- Users can only see organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
    )
  );

-- Users can create organizations (for onboarding)
CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (true);

-- Only OWNER role can update organizations
CREATE POLICY "Owners can update their organizations"
  ON organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'OWNER'
    )
  );

-- Only OWNER role can delete organizations
CREATE POLICY "Owners can delete their organizations"
  ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'OWNER'
    )
  );

-- RLS Policies for memberships
-- Users can view memberships for organizations they belong to
CREATE POLICY "Users can view memberships in their organizations"
  ON memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- Users can create memberships (for onboarding - they create their own OWNER membership)
CREATE POLICY "Users can create their own OWNER membership"
  ON memberships
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'OWNER'
  );

-- Only OWNER role can create other memberships
CREATE POLICY "Owners can create memberships"
  ON memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'OWNER'
    )
  );

-- Only OWNER role can update memberships (role changes)
CREATE POLICY "Owners can update memberships"
  ON memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'OWNER'
    )
  );

-- Only OWNER role can delete memberships
CREATE POLICY "Owners can delete memberships"
  ON memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'OWNER'
    )
  );

