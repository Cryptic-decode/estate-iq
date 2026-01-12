-- Fix create_organization_for_user function overload ambiguity
-- Drop all existing overloads and recreate with single 4-parameter version

-- Drop the function completely (removes all overloads)
DROP FUNCTION IF EXISTS create_organization_for_user(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS create_organization_for_user(TEXT, TEXT, UUID, TEXT);

-- Recreate with single 4-parameter version (currency has default)
CREATE OR REPLACE FUNCTION create_organization_for_user(
  org_name TEXT,
  org_slug TEXT,
  user_uuid UUID,
  org_currency TEXT DEFAULT 'NGN'
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert organization with currency (bypasses RLS because function is SECURITY DEFINER)
  INSERT INTO organizations (name, slug, currency)
  VALUES (org_name, org_slug, org_currency)
  RETURNING id INTO new_org_id;

  -- Create OWNER membership
  INSERT INTO memberships (user_id, organization_id, role)
  VALUES (user_uuid, new_org_id, 'OWNER');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

