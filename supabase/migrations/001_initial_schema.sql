-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid NOT NULL,
  plan text DEFAULT 'trial',
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  max_seats int DEFAULT 1,
  settings jsonb DEFAULT '{
    "bot_display_name": "",
    "consent_disclosure_text": "",
    "data_retention_days": 90
  }',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  org_id uuid REFERENCES organizations(id),
  role text DEFAULT 'closer',
  zoom_access_token text,
  zoom_refresh_token text,
  default_framework text DEFAULT 'nepq',
  notification_preferences jsonb DEFAULT '{
    "email_weekly_digest": true,
    "email_call_summary": true,
    "email_trial_expiring": true,
    "email_payment_failed": true,
    "in_app_cue_card_sound": true,
    "in_app_low_talk_ratio_alert": true,
    "in_app_call_duration_warning": true
  }',
  last_active_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Invitations
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  email text NOT NULL,
  role text DEFAULT 'closer',
  invited_by uuid REFERENCES users(id),
  status text DEFAULT 'pending',
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Offers
CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES users(id),
  name text NOT NULL,
  price decimal NOT NULL,
  guarantee text,
  common_objections text[],
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Calls
CREATE TABLE calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  org_id uuid REFERENCES organizations(id),
  offer_id uuid REFERENCES offers(id),
  recall_bot_id text,
  meeting_url text NOT NULL,
  prospect_name text,
  prospect_email text,
  status text DEFAULT 'scheduled',
  outcome text,
  deal_value decimal,
  deal_health_score int,
  talk_ratio_closer float,
  talk_ratio_prospect float,
  duration_seconds int,
  summary text,
  follow_up_email text,
  what_you_should_have_said jsonb,
  next_steps text[],
  recording_url text,
  framework_used text DEFAULT 'nepq',
  cue_cards_shown_count int DEFAULT 0,
  cue_cards_used_count int DEFAULT 0,
  error_message text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Transcript lines
CREATE TABLE transcript_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  speaker text NOT NULL,
  content text NOT NULL,
  timestamp_ms int NOT NULL,
  is_objection boolean DEFAULT false,
  is_buying_signal boolean DEFAULT false,
  objection_type text,
  created_at timestamptz DEFAULT now()
);

-- Framework cards
CREATE TABLE framework_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  framework text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  trigger_keywords text[],
  suggested_response text NOT NULL,
  framework_reference text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Cue cards shown
CREATE TABLE cue_cards_shown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid REFERENCES calls(id) ON DELETE CASCADE,
  card_id uuid REFERENCES framework_cards(id),
  trigger_text text,
  shown_at timestamptz DEFAULT now(),
  was_used boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  confidence float
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  org_id uuid REFERENCES organizations(id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  metadata jsonb DEFAULT '{}',
  channel text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_org_id ON calls(org_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_transcript_lines_call_id ON transcript_lines(call_id);
CREATE INDEX idx_transcript_lines_call_id_timestamp ON transcript_lines(call_id, timestamp_ms);
CREATE INDEX idx_notifications_user_id_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_cue_cards_shown_call_id ON cue_cards_shown(call_id);
CREATE INDEX idx_framework_cards_org_id ON framework_cards(org_id);
CREATE INDEX idx_offers_org_id ON offers(org_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_cards_shown ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- organizations: members can read their own org; owners can update
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id IN (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY "org_update_owner" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

-- users: users see themselves; owners/admins see their org
CREATE POLICY "users_select_self" ON users
  FOR SELECT USING (id = auth.uid() OR org_id IN (
    SELECT org_id FROM users u2
    WHERE u2.id = auth.uid() AND u2.role IN ('owner', 'admin')
  ));
CREATE POLICY "users_update_self" ON users
  FOR UPDATE USING (id = auth.uid());

-- calls: closer sees own; owner/admin sees org
CREATE POLICY "calls_select" ON calls
  FOR SELECT USING (
    user_id = auth.uid() OR org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "calls_insert" ON calls
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calls_update" ON calls
  FOR UPDATE USING (user_id = auth.uid());

-- transcript_lines: via call ownership
CREATE POLICY "transcript_select" ON transcript_lines
  FOR SELECT USING (
    call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
    OR call_id IN (
      SELECT c.id FROM calls c
      JOIN users u ON u.id = auth.uid()
      WHERE c.org_id = u.org_id AND u.role IN ('owner', 'admin')
    )
  );
CREATE POLICY "transcript_insert" ON transcript_lines
  FOR INSERT WITH CHECK (
    call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
  );

-- framework_cards: org or system (org_id IS NULL)
CREATE POLICY "framework_cards_select" ON framework_cards
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "framework_cards_insert" ON framework_cards
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "framework_cards_update" ON framework_cards
  FOR UPDATE USING (
    org_id IS NOT NULL AND org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- notifications: own only
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- invitations: org owner/admin
CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR email = (SELECT email FROM users WHERE id = auth.uid())
  );
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- offers: org members read; owner/admin write
CREATE POLICY "offers_select" ON offers
  FOR SELECT USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));
CREATE POLICY "offers_insert" ON offers
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY "offers_update" ON offers
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- cue_cards_shown: via call ownership
CREATE POLICY "cue_cards_shown_select" ON cue_cards_shown
  FOR SELECT USING (
    call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
  );
CREATE POLICY "cue_cards_shown_insert" ON cue_cards_shown
  FOR INSERT WITH CHECK (
    call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
  );
CREATE POLICY "cue_cards_shown_update" ON cue_cards_shown
  FOR UPDATE USING (
    call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
  );
