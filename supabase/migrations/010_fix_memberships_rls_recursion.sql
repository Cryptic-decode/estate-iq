-- Fix self-referential RLS policies on memberships that can cause recursion errors.
-- This migration replaces policies that query the memberships table inside memberships policies.
-- It uses SECURITY DEFINER helper functions created in 002_enable_rls.sql.

-- MEMBERSHIPS: drop problematic policies (if they exist)
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;
DROP POLICY IF EXISTS "Users can create their own OWNER membership" ON memberships;
DROP POLICY IF EXISTS "Owners can create memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can delete memberships" ON memberships;

-- MEMBERSHIPS: SELECT
-- MVP-safe: users can read only their own membership rows (no recursion).
CREATE POLICY "Users can view their own memberships"
  ON memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- MEMBERSHIPS: INSERT
-- Onboarding: user can create their own OWNER membership for a newly created org.
CREATE POLICY "Users can create their own OWNER membership"
  ON memberships
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'OWNER'
  );

-- Team management: OWNER can create memberships for their org (uses SECURITY DEFINER role lookup).
CREATE POLICY "Owners can create memberships"
  ON memberships
  FOR INSERT
  WITH CHECK (
    get_user_org_role(organization_id, auth.uid()) = 'OWNER'
  );

-- MEMBERSHIPS: UPDATE
CREATE POLICY "Owners can update memberships"
  ON memberships
  FOR UPDATE
  USING (
    get_user_org_role(organization_id, auth.uid()) = 'OWNER'
  )
  WITH CHECK (
    get_user_org_role(organization_id, auth.uid()) = 'OWNER'
  );

-- MEMBERSHIPS: DELETE
CREATE POLICY "Owners can delete memberships"
  ON memberships
  FOR DELETE
  USING (
    get_user_org_role(organization_id, auth.uid()) = 'OWNER'
  );

-- ORGANIZATIONS: Fix INSERT policy
-- Drop and recreate the INSERT policy to ensure it works correctly
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create a SECURITY DEFINER function for organization creation (bypasses RLS)
-- This ensures onboarding works even if RLS policies are strict
CREATE OR REPLACE FUNCTION create_organization_for_user(
  org_name TEXT,
  org_slug TEXT,
  user_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert organization (bypasses RLS because function is SECURITY DEFINER)
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Create OWNER membership
  INSERT INTO memberships (user_id, organization_id, role)
  VALUES (user_uuid, new_org_id, 'OWNER');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow any authenticated user to create an organization (for onboarding)
-- Using a simple check that should work reliably
CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  WITH CHECK (true);


