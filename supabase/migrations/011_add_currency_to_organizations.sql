-- Add currency column to organizations table
-- Default currency is NGN (Nigerian Naira)

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- Add constraint to ensure valid currency codes (ISO 4217)
-- Common currencies: NGN, USD, EUR, GBP, etc.
ALTER TABLE organizations
ADD CONSTRAINT organizations_currency_check 
CHECK (currency ~ '^[A-Z]{3}$');

-- Create index for currency lookups (if needed for reporting)
CREATE INDEX IF NOT EXISTS idx_organizations_currency ON organizations(currency);

-- Update existing organizations to have NGN as default (if any exist without currency)
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

