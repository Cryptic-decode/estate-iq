-- Quick fix: Add currency column if missing
-- Run this if you get "column organizations.currency does not exist" error

-- Add currency column (safe to run multiple times)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- Add constraint (drop first if exists to avoid errors)
ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_currency_check;

ALTER TABLE organizations
ADD CONSTRAINT organizations_currency_check 
CHECK (currency ~ '^[A-Z]{3}$');

-- Update existing organizations to have NGN as default
UPDATE organizations
SET currency = 'NGN'
WHERE currency IS NULL OR currency = '';

-- Update create_organization_for_user function to include currency
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

