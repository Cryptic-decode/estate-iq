-- Add guarantor details to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS guarantor_full_name TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_email TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_phone TEXT;

