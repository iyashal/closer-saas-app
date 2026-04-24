-- Add billing subscription columns to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS billing_interval text CHECK (billing_interval IN ('month','year')),
  ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active','trialing','past_due','canceled','incomplete','unpaid')),
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Extend plan check constraint to include 'starter'
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('trial','starter','solo','team','canceled'));

-- Add daily call limit tracking to calls
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS counted_for_daily_limit boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_calls_user_id_counted_created
  ON calls(user_id, counted_for_daily_limit, created_at DESC)
  WHERE counted_for_daily_limit = true;

-- Billing events table for idempotent webhook processing
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON billing_events(org_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_subscription_id ON organizations(stripe_subscription_id);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Org members can read their own billing events; writes are service-role only
CREATE POLICY "billing_events_select" ON billing_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );
