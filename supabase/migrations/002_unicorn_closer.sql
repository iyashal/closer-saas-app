-- Add unicorn_closer_grade and deal_health_reasoning to calls
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS deal_health_reasoning text,
  ADD COLUMN IF NOT EXISTS unicorn_closer_grade jsonb;

-- Update org settings default to include default_framework = 'unicorn_closer'
ALTER TABLE organizations
  ALTER COLUMN settings SET DEFAULT '{
    "bot_display_name": "",
    "consent_disclosure_text": "",
    "data_retention_days": 90,
    "default_framework": "unicorn_closer"
  }';

-- Backfill existing orgs that don't yet have default_framework set
UPDATE organizations
SET settings = settings || '{"default_framework": "unicorn_closer"}'::jsonb
WHERE settings->>'default_framework' IS NULL;
