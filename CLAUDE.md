# CLAUDE.md — CloseForce.io

## Project Setup

- **Repository:** `closer-saas-app`
- **GitHub:** `github.com/iyashal/closer-saas-app`
- **Local path:** `~/projects/closer_saas_app`
- **OS:** WSL2 Ubuntu on Windows 11
- **Domain:** `closeforce.io`

---

## What This App Is

CloseForce.io is a real-time AI sales coaching SaaS for high-ticket closers. A bot joins the closer's Zoom or Google Meet call (like Fireflies.ai), transcribes the conversation live, detects objections and buying signals in real time, and surfaces framework-specific cue cards on a second-screen dashboard so the closer knows exactly what to say next. After the call, it generates an AI summary, deal health score, and follow-up email draft.

**Target users:** Solo high-ticket closers and closing agencies (2–50 closers) selling $3k–$50k coaching, consulting, and info-product offers on Zoom/Google Meet.

**This is NOT a note-taker.** The core value is LIVE, in-call coaching — cue cards appearing within 1–2 seconds of an objection being spoken. Post-call summaries are secondary. Every architectural decision should prioritize low latency on the real-time path.

---

## Tech Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS (utility-first, no custom CSS files unless absolutely necessary)
- **Icons:** Lucide React
- **Routing:** React Router v6
- **State Management:** Zustand (keep it simple, no Redux)
- **Real-time updates:** Supabase Realtime subscriptions for pushing cue cards and transcript lines to the dashboard
- **Build tool:** Vite
- **Charts:** Recharts (for analytics dashboards)

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Fastify (not Express — faster, better TypeScript support)
- **WebSockets:** ws library for Deepgram audio streaming and frontend push
- **Database:** Supabase (PostgreSQL) via @supabase/supabase-js
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **File storage:** Supabase Storage (for call recordings if retained)
- **Deployment:** Railway (Dockerfile-based)
- **Logging:** Pino (structured JSON logs, never console.log in production)
- **Validation:** Zod for all request/response schemas
- **Scheduled jobs:** node-cron for trial expiry checks, weekly digests, alerts

### External Services
- **Recall.ai** — bot deployment into Zoom/Google Meet, audio streaming, recording storage
- **Deepgram** — real-time speech-to-text (Nova-3 model, streaming mode)
- **Anthropic Claude API** — Haiku 4.5 for real-time objection detection, Sonnet for post-call summaries
- **Stripe** — billing, subscriptions, customer portal
- **Resend** — transactional and digest emails (resend.com, free tier 100 emails/day)

### Accounts Status
| Service | Status | Action Needed |
|---|---|---|
| Supabase | ✅ Ready | Create project, run migrations |
| Stripe | ✅ Ready | Create products + price IDs for all 4 plans (solo monthly, solo annual, team monthly, team annual) |
| Recall.ai | ❌ Not set up | Sign up at recall.ai, get API key |
| Deepgram | ❌ Not set up | Sign up at deepgram.com, get API key, enable Nova-3 streaming |
| Anthropic | ❌ Not set up | Sign up at console.anthropic.com, get API key, add billing |
| Resend | ❌ Not set up | Sign up at resend.com, verify closeforce.io domain, get API key |

### Infrastructure
- **Backend hosting:** Railway (Dockerfile-based)
- **Frontend hosting:** Vercel (connect GitHub repo, auto-deploy from main)
- **Database:** Supabase hosted PostgreSQL
- **Domain:** closeforce.io → Vercel for frontend, api.closeforce.io → Railway for backend
- **Environment variables:** All secrets in .env, never hardcoded. Use dotenv for local dev.

---

## Pricing & Billing

| Plan | Monthly | Annual (15% off) | Details |
|---|---|---|---|
| **Solo** | $147/mo | $124.95/mo billed as $1,499.40/yr | 1 user, unlimited calls, all features |
| **Team** | $127/seat/mo | $107.95/seat/mo billed annually | Minimum 2 seats, org management, leaderboard, team analytics |
| **Trial** | Free | — | 14 days, no credit card required, all features unlocked |

### Billing Rules
- Trial: 14 calendar days from signup, full feature access, no credit card required
- Show days remaining in header bar: "Trial: 9 days left" → links to billing/upgrade page
- Trial expiring notifications: at 7 days, 2 days, and on expiry
- When trial expires: read-only access to past calls and data, cannot launch new bots, upgrade modal appears on dashboard
- Annual billing: single upfront charge for the full year
- Team plan minimum: 2 seats. Owner pays for all seats. Cannot go below 2 on team plan.
- Adding/removing seats: through Stripe Customer Portal (prorated automatically by Stripe)
- Switching Solo ↔ Team: Solo→Team creates seat management, Team→Solo only allowed if org has 1 member
- Stripe Customer Portal handles: plan changes, payment method updates, cancellations, invoice history
- On cancellation: access continues until end of current billing period, then downgrades to expired trial behavior

---

## Multi-Tenant Organization Structure

CloseForce.io uses an **organization-based multi-tenant model**. Every user belongs to an organization. Solo users are the sole owner of a 1-person org. Team plan users share an org with multiple members.

### Roles

| Role | Permissions |
|---|---|
| **Owner** | Everything. Billing, add/remove members, view ALL calls from ALL closers, leaderboard, team analytics, manage offers, manage frameworks. One per org. Cannot be removed. |
| **Admin** | Same as Owner EXCEPT: cannot manage billing, cannot delete the org, cannot remove the Owner. Good for sales managers. |
| **Closer** | Launch bots, view their OWN calls only, use frameworks, view their own analytics. Cannot see other closers' calls or data. Cannot manage billing, members, or org settings. |

### How It Works
- **Solo plan signup:** Creates a 1-person org, user is Owner. Team features (members page, leaderboard, team analytics) hidden in UI.
- **Team plan signup:** Creates an org, user is Owner. Team features visible.
- **Inviting members:** Owner/Admin invites via email → invitation record created with secure token → invite email sent via Resend → invitee clicks link → /invite/:token → signup form pre-filled with email → on signup, user joins existing org as "Closer" role (Owner can change role later).
- **Invite expiry:** 7 days. After that, Owner must re-invite.
- **Solo upgrading to Team:** Org already exists. Unlock team features, set max_seats to purchased count (min 2). Owner can now invite members.

### Data Isolation (Critical)
- Row Level Security (RLS) enforced on ALL tables at the database level
- Closers can ONLY read/write rows where `user_id = auth.uid()`
- Owners/Admins can read rows where `org_id = their org_id` (all team data)
- Cross-org data is NEVER accessible under any circumstances
- Framework cards with `org_id IS NULL` are system defaults, readable by all orgs

---

## Database Schema (Supabase/PostgreSQL)

```sql
-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid NOT NULL,
  plan text DEFAULT 'trial',             -- 'trial', 'solo', 'team', 'canceled'
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
  role text DEFAULT 'closer',            -- 'owner', 'admin', 'closer'
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
  status text DEFAULT 'pending',         -- 'pending', 'accepted', 'expired'
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,       -- 7 days from creation
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
  status text DEFAULT 'scheduled',       -- 'scheduled', 'bot_joining', 'live', 'processing', 'completed', 'failed'
  outcome text,                          -- 'closed', 'follow_up', 'lost', null
  deal_value decimal,
  deal_health_score int,
  talk_ratio_closer float,
  talk_ratio_prospect float,
  duration_seconds int,
  summary text,
  follow_up_email text,
  what_you_should_have_said jsonb,       -- [{timestamp, objection, your_response, better_response}]
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
  speaker text NOT NULL,                 -- 'closer' or 'prospect'
  content text NOT NULL,
  timestamp_ms int NOT NULL,
  is_objection boolean DEFAULT false,
  is_buying_signal boolean DEFAULT false,
  objection_type text,
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

-- Framework cards
CREATE TABLE framework_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,                           -- null = system default, uuid = org custom
  framework text NOT NULL,               -- 'nepq', 'straight_line', 'custom'
  category text NOT NULL,
  title text NOT NULL,
  trigger_keywords text[],
  suggested_response text NOT NULL,
  framework_reference text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
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
  channel text NOT NULL,                 -- 'in_app', 'email', 'both'
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

-- Enable RLS on ALL tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cue_cards_shown ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

---

## Notification & Alert System

### Notification Types — Closers

| Type | Trigger | Channel | Message |
|---|---|---|---|
| `call_summary_ready` | Post-call processing complete | both | "Your call with {prospect} is ready to review. Deal health: {score}/100" |
| `trial_expiring_7d` | 7 days before trial ends | both | "Your CloseForce trial ends in 7 days. Upgrade to keep coaching on every call." |
| `trial_expiring_2d` | 2 days before trial ends | both | "Your trial ends in 2 days. Don't lose access." |
| `trial_expired` | Trial period ends | both | "Your trial has ended. Upgrade now to continue using CloseForce." |
| `weekly_digest` | Every Monday 9am UTC | email | Weekly stats: calls made, close rate, top objections, trend vs last week |
| `bot_failed` | Recall bot fails to join | in_app | "Bot couldn't join your meeting. Check the link and try again." |
| `bot_waiting_room` | Bot is in waiting room | in_app | "Bot is in the waiting room — admit it to start." |
| `close_rate_milestone` | Close rate crosses 50%, 60%, 70%, 80% | in_app | "You're on fire — your close rate just hit {rate}%!" |
| `streak_alert` | 3+ consecutive closes | in_app | "3-call closing streak! Keep it going." |

### Notification Types — Owners/Admins (Team Plan)

| Type | Trigger | Channel | Message |
|---|---|---|---|
| `member_joined` | Invited closer accepts and signs up | both | "{name} just joined your team." |
| `team_weekly_digest` | Every Monday 9am UTC | email | Team stats: total calls, team close rate, top closer, closers needing coaching |
| `closer_struggling` | Closer's close rate below 20% over 5+ calls | in_app | "{name} has closed {n} of {total} recent calls. Consider reviewing their calls." |
| `seat_limit_reached` | All seats filled, tried to invite more | in_app | "All {max_seats} seats are in use. Add more seats in billing." |
| `payment_failed` | Stripe invoice.payment_failed | both | "Your payment failed. Update your card to avoid interruption." |
| `subscription_canceled` | Stripe subscription.deleted | both | "Your subscription has been canceled. Access continues until {period_end}." |
| `new_call_completed` | Any closer in org finishes a call | in_app | "{closer_name} finished a call with {prospect}. Outcome: {outcome}." |
| `invite_expired` | Invitation not accepted within 7 days | in_app | "Your invitation to {email} expired. Re-invite if needed." |

### In-App Notification UI
- Bell icon in header with unread count badge (red circle with number)
- Click bell → dropdown panel showing latest 20 notifications, grouped by "Today" / "Earlier"
- Each notification: icon by type, title, body preview, time ago, unread indicator (blue dot)
- Click notification → navigate to relevant page (call summary, billing, team page)
- "Mark all as read" link at top of panel
- Notification preferences page: toggle each type on/off per channel (in_app and email independently)

### Live Call Alerts (On-Screen During Active Call — NOT Notifications)
These appear directly on the live call view bottom bar, not in the notification system:
- **Talk ratio warning:** Closer above 60% talk ratio for 2+ minutes → amber bar: "You're talking too much — let them speak"
- **Long silence (positive):** No one speaks for 8+ seconds → subtle pulse: "Good — let the silence work"
- **Missed buying signal:** AI detects buying signal, closer doesn't attempt close within 30 seconds → blue nudge: "They showed interest — try a trial close"
- **Call duration 45min:** "Call is running long — move toward the close"
- **Call duration 60min:** "60 minutes. Consider booking a follow-up if they haven't decided."

### Email Implementation
- Use Resend (resend.com) as email provider
- Send from: noreply@closeforce.io (requires DNS verification of closeforce.io domain in Resend)
- Transactional emails: call summary, trial warnings, payment failures, invite emails
- Digest emails: weekly closer stats, weekly team stats
- All emails: clean minimal design, CloseForce.io logo at top, single primary CTA button, unsubscribe link at bottom
- Unsubscribe link updates user's notification_preferences in database
- Email templates stored as functions in /apps/server/src/services/email-service.ts

---

## Project Structure

```
closer-saas-app/
├── CLAUDE.md
├── README.md
├── package.json                       # Root workspace config (npm workspaces)
├── .env.example
├── .gitignore
│
├── apps/
│   ├── web/                           # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/                # Button, Modal, Badge, Card, Input, Select, Toggle, Skeleton, Tooltip
│   │   │   │   ├── call/              # CueCard, TranscriptLine, TalkRatioBar, CallTimer, LiveAlertBar
│   │   │   │   ├── dashboard/         # StatCard, CallsTable, LeaderboardRow, LeaderboardTable
│   │   │   │   ├── layout/            # Sidebar, Header, NotificationBell, NotificationPanel, TrialBanner, RoleGate
│   │   │   │   └── settings/          # BillingCard, PlanSelector, MemberRow, InviteModal, NotificationPrefs
│   │   │   ├── pages/
│   │   │   │   ├── landing.tsx
│   │   │   │   ├── login.tsx
│   │   │   │   ├── signup.tsx
│   │   │   │   ├── accept-invite.tsx   # /invite/:token
│   │   │   │   ├── onboarding.tsx      # Post-signup: org name, first offer, connect Zoom
│   │   │   │   ├── dashboard.tsx
│   │   │   │   ├── new-call.tsx        # /call/new — select offer, paste link, launch
│   │   │   │   ├── call-live.tsx       # /call/:callId (live state)
│   │   │   │   ├── call-summary.tsx    # /call/:callId (completed state)
│   │   │   │   ├── call-history.tsx
│   │   │   │   ├── frameworks.tsx
│   │   │   │   ├── analytics.tsx
│   │   │   │   ├── team.tsx            # Team plan only: members + leaderboard
│   │   │   │   ├── settings.tsx
│   │   │   │   └── billing.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   ├── use-org.ts          # Current org, role, plan, isOwner, isAdmin, isCloser
│   │   │   │   ├── use-trial.ts        # isTrialActive, isExpired, daysRemaining
│   │   │   │   ├── use-realtime-transcript.ts
│   │   │   │   ├── use-realtime-cue-cards.ts
│   │   │   │   └── use-notifications.ts
│   │   │   ├── stores/
│   │   │   │   ├── auth-store.ts
│   │   │   │   ├── call-store.ts
│   │   │   │   └── notification-store.ts
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts
│   │   │   │   ├── api.ts              # Centralized fetch wrapper for backend
│   │   │   │   ├── stripe.ts
│   │   │   │   └── utils.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── assets/
│   │   │       └── logo.svg
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                        # Node.js backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── calls.ts
│       │   │   ├── offers.ts
│       │   │   ├── frameworks.ts
│       │   │   ├── org.ts              # Org settings, members, invitations
│       │   │   ├── analytics.ts
│       │   │   ├── notifications.ts
│       │   │   ├── billing.ts
│       │   │   └── webhooks/
│       │   │       ├── recall.ts
│       │   │       └── stripe.ts
│       │   ├── services/
│       │   │   ├── recall-service.ts
│       │   │   ├── deepgram-service.ts
│       │   │   ├── claude-service.ts
│       │   │   ├── stripe-service.ts
│       │   │   ├── notification-service.ts
│       │   │   ├── email-service.ts     # Resend API + email templates
│       │   │   └── analytics-service.ts
│       │   ├── ws/
│       │   │   ├── call-session.ts      # Manages one active call's audio pipeline
│       │   │   └── handler.ts
│       │   ├── prompts/
│       │   │   ├── realtime-detection.ts
│       │   │   ├── post-call-summary.ts
│       │   │   └── follow-up-email.ts
│       │   ├── jobs/
│       │   │   ├── trial-expiry-checker.ts
│       │   │   ├── weekly-digest.ts
│       │   │   ├── struggling-closer-check.ts
│       │   │   └── invite-expiry-checker.ts
│       │   ├── lib/
│       │   │   ├── supabase.ts
│       │   │   ├── logger.ts            # Pino setup
│       │   │   ├── auth-middleware.ts
│       │   │   ├── role-guard.ts        # requireRole('owner'), requireRole('admin', 'owner')
│       │   │   ├── plan-guard.ts        # requirePlan('team'), requireActivePlan()
│       │   │   └── errors.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types.ts
│       │   ├── constants.ts            # Objection categories, frameworks, roles
│       │   └── pricing.ts             # Plan definitions, feature gates, seat limits
│       ├── tsconfig.json
│       └── package.json
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql
```

---

## Core Modules — Build Order

### Module 1: Scaffolding + Auth + Org + Trial
- Initialize npm workspaces monorepo
- Set up Vite + React + TypeScript + Tailwind for `apps/web`
- Set up Fastify + TypeScript for `apps/server`
- Set up shared package
- Supabase: run migration with full schema
- Auth: email/password signup + login via Supabase Auth
- On signup: create organization (name from form or "{full_name}'s Team"), set user as owner, set trial_ends_at = now + 14 days, plan = 'trial'
- Protected route wrapper: redirect to /login if no session
- Role-aware route wrapper: check user.role, hide/redirect for unauthorized pages
- Trial hooks: `useTrial()` → { isActive, isExpired, daysRemaining, trialEndsAt }
- Trial banner in header: "Trial: X days left — Upgrade" (yellow when <3 days, red when expired)
- When trial expired: show upgrade modal on dashboard, block /call/new route
- Onboarding page after first signup: enter org name, create first offer

### Module 2: Org Management + Invite Flow
- Settings page: org name, bot display name, consent text
- Members page (Team plan, Owner/Admin only): list members with role, email, last active, calls this week
- Invite flow: email input → create invitation with crypto.randomUUID() token → send via Resend → /invite/:token page → signup with pre-filled email → join org as 'closer'
- Change member role (Owner only): dropdown to switch closer↔admin
- Remove member (Owner only): confirmation modal, remove from org
- Seat counter: "{used}/{max_seats} seats" — if at limit, show "Add seats" CTA → billing

### Module 3: Offer Management
- CRUD scoped to org_id
- Form: name, price (number), guarantee (text), description (textarea), common objections (tag input — type and press Enter)
- List view with active/inactive toggle
- At least one active offer required before launching a call (enforce in new-call page)
- All org members can see and use offers; only Owner/Admin can create/edit/delete

### Module 4: Recall.ai Bot Deployment
- /call/new page: select offer (dropdown), paste Zoom/Meet link (input), prospect name (optional), "Launch Bot" button
- Pre-launch checks: trial active OR active subscription, no existing live call for this user, valid URL format
- Backend: POST to Recall.ai to create bot, store recall_bot_id on call record, set status 'bot_joining'
- Bot display name: org.settings.bot_display_name or "{org.name} Notes"
- Webhook handler at POST /webhooks/recall:
  - `bot.joining` → status 'bot_joining'
  - `bot.in_waiting_room` → push `bot_waiting_room` notification
  - `bot.in_call` → status 'live', set started_at, start audio pipeline
  - `bot.call_ended` → status 'processing', trigger post-call
  - `bot.error` → status 'failed', set error_message, push `bot_failed` notification
- "Remove Bot" endpoint: DELETE, no confirmation, immediate Recall API call, status → 'completed' or 'failed'
- Rate limit: 1 active bot per user (check for status IN ('bot_joining', 'live'))

### Module 5: Live Transcription Pipeline
- On bot in_call: open WebSocket to Recall.ai for audio stream
- Pipe audio to Deepgram Nova-3 streaming: model=nova-3, language=en, punctuate=true, diarize=true, interim_results=true, endpointing=300
- Speaker mapping: first speaker = closer (they were already in the call before bot joined)
- FINAL transcript results: batch insert to DB every 3–5 seconds, push to frontend immediately via Supabase Realtime channel `call:{callId}:transcript`
- INTERIM results: push to frontend only (lighter opacity text), do NOT save or send to LLM
- Talk ratio: count words per speaker in-memory, push updated ratio every 10 seconds
- **LATENCY TARGET: spoken word to screen < 1.5 seconds**
- Deepgram disconnect: auto-reconnect with backoff, show "Transcription paused" on frontend

### Module 6: Real-Time Objection Detection + Cue Cards
- On each FINAL transcript line: send 60-second rolling buffer to Claude Haiku 4.5
- System prompt includes: offer name, price, guarantee, description, common_objections, selected framework
- Response: JSON with objection_type, buying_signal, coaching_nudge, confidence
- If not "none" AND confidence > 0.7: match framework_card by category, push to frontend via Supabase Realtime `call:{callId}:cues`, insert to cue_cards_shown
- Debounce: same category cannot re-trigger within 60 seconds
- If Claude response takes > 3 seconds: skip, don't queue
- If Claude errors: log, continue — never crash the call session
- **LATENCY TARGET: objection spoken to cue card on screen < 2.5 seconds**

### Module 7: Live Call Dashboard (Frontend)
- /call/:callId — different layout based on call.status
- When status='live': full live view with transcript panel, cue card panel, bottom bar
- Left panel (60%): scrolling transcript, speaker labels, objection/signal highlighting, auto-scroll with "Jump to latest" escape hatch
- Right panel (40%): cue card stack (max 4), slide-in animation, category pill, trigger text, suggested response (large font), framework ref, Dismiss/Used This buttons
- Optional chime sound on new cue card (Web Audio API, togglable via notification_preferences)
- Bottom bar: talk ratio bar, live alerts (talk ratio warning, silence, duration), prospect name/offer/value, action buttons (Mark Closed, Mark Follow-Up, End Call, Remove Bot)

### Module 8: Post-Call Processing
- Triggered when status → 'processing'
- Fetch full transcript, send to Claude Sonnet with offer context
- Generate: summary, what_you_should_have_said, deal_health_score (0-100), next_steps, follow_up_email
- Calculate final talk ratios and cue card counts
- Update call: status → 'completed', save all generated fields
- Create `call_summary_ready` notification for closer
- If Team plan: create `new_call_completed` notification for Owner/Admins
- Check for milestones: close rate crossing thresholds, closing streaks

### Module 9: Post-Call Summary Page
- /call/:callId when status='completed'
- Full transcript with highlights and timestamps
- AI summary section
- Deal health gauge (0-100, color-coded)
- Objection timeline (horizontal bar with clickable markers)
- "What You Should Have Said" cards per objection
- Follow-up email with "Copy to Clipboard"
- Next steps checklist
- Call metadata: duration, talk ratio bar, framework, cue cards shown/used
- Audio player (Recall recording URL)
- "Export Notes" — plain text copy for CRM paste

### Module 10: Dashboard + Leaderboard
- /dashboard
- **Closer view (and Solo plan):** stat cards (Close Rate, Calls This Week, Revenue Closed, Avg Deal Size), recent calls table, "New Call" CTA
- **Owner/Admin view (Team plan):** team stat cards (Team Close Rate, Total Calls, Total Revenue, Active Closers), leaderboard table (rank, closer name, calls this week, close rate, revenue, avg deal health — sortable), recent calls across all closers (with closer name column), "View as {closer}" to see individual dashboard

### Module 11: Analytics
- /analytics
- Closer: personal charts only
- Owner/Admin: toggle "My Analytics" / "Team Analytics"
- Charts (Recharts): close rate over time (line), objection frequency (bar), cue card effectiveness (close rate with vs without cards), talk ratio trend, deal health trend, revenue over time (monthly bar)
- Date range: 7 days, 30 days, 90 days, All time
- Team Analytics: aggregated charts + per-closer comparison

### Module 12: Frameworks Library
- /frameworks
- Tabs: NEPQ | Straight Line | Custom
- Cards grouped by category, each showing title, response, framework ref, active toggle
- Add/edit/delete custom cards (org-scoped)
- System default cards (org_id IS NULL) are read-only
- Import/export as JSON

### Module 13: Billing (Stripe)
- /settings/billing (Owner only)
- Current plan, billing cycle, next payment date
- Plan cards: Solo vs Team, monthly/annual toggle (show 15% savings on annual)
- Upgrade → Stripe Checkout Session
- Manage subscription → Stripe Customer Portal
- Team seat management
- Webhook handler POST /webhooks/stripe:
  - `checkout.session.completed` → activate plan on org
  - `customer.subscription.updated` → sync plan/seat changes
  - `customer.subscription.deleted` → set plan 'canceled'
  - `invoice.payment_failed` → `payment_failed` notification
  - `invoice.paid` → clear payment failure state

### Module 14: Settings + Notifications
- /settings: profile, org settings (Owner only), default framework, notification preferences (per-type per-channel toggles), data retention, danger zone (delete account / leave org)
- Notification bell in header with panel
- Background jobs via node-cron:
  - Trial expiry checker: daily, sends 7d/2d/expired notifications
  - Weekly digest: Mondays, sends closer + team digests via email
  - Struggling closer check: daily, flags closers with <20% close rate over 5+ calls
  - Invite expiry: daily, marks pending invites as expired after 7 days, notifies Owner

---

## LLM Prompts — /apps/server/src/prompts/

### realtime-detection.ts (Haiku 4.5)
```
System: You are an expert high-ticket sales call analyzer for CloseForce.io. You are analyzing a LIVE sales call.

The closer is selling: {offer.name}
Price: ${offer.price}
Description: {offer.description}
Guarantee: {offer.guarantee}
Known objections for this offer: {offer.common_objections}

Analyze the latest transcript and classify what is happening RIGHT NOW.

Rules:
- Only flag if genuinely confident. False positives are WORSE than misses — a wrong cue card mid-close distracts and breaks flow.
- Confidence 0.8+ only when classification is unambiguous.
- "none" is correct most of the time. Rapport, discovery, and neutral discussion are not flagged.
- Distinguish real objections from questions. "How much is it?" = curiosity. "That's way more than I expected" = price objection.

Respond ONLY with valid JSON. No markdown, no explanation.

{"objection_type":"price|spouse|think_about_it|send_info|trust|timing|competitor|none","buying_signal":"asking_next_steps|asking_start_date|asking_guarantee|asking_details|expressing_desire|none","coaching_nudge":"talk_ratio_high|missed_buying_signal|pitched_too_early|good_trial_close_moment|let_silence_work|none","confidence":0.0}
```

### post-call-summary.ts (Sonnet)
Full transcript + offer context → structured output: summary (3–5 paragraphs), objection log (timestamp, what was said, how handled, better alternative), deal health score (0–100 with reasoning), next steps (3–5), follow-up email draft (personalized, references specific pain points).

### follow-up-email.ts (Sonnet)
Generate a follow-up email that sounds human, references specific conversation points, includes a clear CTA. Not salesy — conversational and warm.

---

## Coding Conventions

### General
- TypeScript strict mode — no `any` unless unavoidable
- async/await only, no .then() chains
- Early returns to avoid nesting
- Every external API call in try/catch with meaningful Pino log
- Structured logging: every log includes `{ callId, userId, orgId }` where applicable
- No console.log in production

### Naming
- Files: kebab-case (`live-call-view.tsx`)
- Components: PascalCase (`CueCard`)
- Functions/variables: camelCase
- DB columns: snake_case
- Env vars: UPPER_SNAKE_CASE
- Types: PascalCase, no prefix (`Call`, not `ICall`)
- Stores: `use{Name}Store`

### Frontend
- One component per file
- Tailwind exclusively — no CSS files, no inline styles
- Dark mode first
- Color palette: backgrounds (#0a0a0a, #141414, #1a1a1a), white/gray text, blue accent (#3b82f6), green (#10b981), amber (#f59e0b), red (#ef4444)
- All API calls through lib/api.ts
- Skeleton loaders for async, not spinners
- Optimistic UI for cue card actions
- RoleGate component wraps team-only content: `<RoleGate roles={['owner','admin']}>...</RoleGate>`

### Backend
- Thin route handlers — logic in /services/
- Zod validation on all request bodies
- Auth middleware on every route except webhooks and landing
- role-guard and plan-guard middleware
- Rate limit: 1 active bot per user, 10 req/sec per user
- WebSocket: handle disconnect/reconnect gracefully

### Git
- Main branch: `main`
- Feature branches: `feat/module-name`
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Push at end of every session

---

## Environment Variables

```bash
# App
APP_URL=https://closeforce.io
API_URL=https://api.closeforce.io
NODE_ENV=development

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Recall.ai
RECALL_API_KEY=

# Deepgram
DEEPGRAM_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SOLO_MONTHLY_PRICE_ID=
STRIPE_SOLO_ANNUAL_PRICE_ID=
STRIPE_TEAM_MONTHLY_PRICE_ID=
STRIPE_TEAM_ANNUAL_PRICE_ID=

# Resend
RESEND_API_KEY=

# Zoom OAuth
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_REDIRECT_URI=https://api.closeforce.io/auth/zoom/callback
```

---

## Non-Negotiable Rules

1. **Latency is king.** Real-time path optimized for speed. Transcript batch-insert every 3–5s, cue cards pushed instantly.
2. **Cue cards must not annoy.** 60s debounce per category. Max 4 visible. Confidence > 0.7 only. Wrong card mid-close is worse than no card.
3. **Bot killable instantly.** Remove Bot = no confirmation modal, < 2 seconds.
4. **Graceful degradation.** Deepgram drops → "Transcription paused." Claude slow → skip cycle. Recall fails → clear error. Never crash a live call.
5. **Never expose AI to prospect.** Bot name = "{org.name} Notes" by default. No "AI" or "CloseForce" in anything prospect sees.
6. **Desktop-optimized, mobile-aware.** Primary target: 768px–1440px second screen. Must work at phone width.
7. **Role-based everything.** Closers never see other closers' data. RLS at database level, role checks at API level, RoleGate at UI level. Three layers, no exceptions.
8. **Trial = full access.** No feature gating during trial. Only restriction post-expiry: cannot launch new bots. Past data stays accessible forever.
9. **Team plan minimum 2 seats.** Cannot create a team plan with 1 seat.

---

## Current Status

**Phase: Pre-build — Scaffolding needed**

**Next command to Claude Code:**
"Read CLAUDE.md and scaffold the monorepo: initialize npm workspaces, set up apps/web with Vite+React+TypeScript+Tailwind, apps/server with Fastify+TypeScript, packages/shared, and supabase/migrations. Create all directories from the project structure. Set up tsconfig, tailwind config, vite config, Dockerfile, .gitignore, .env.example. Don't build any features yet — just the skeleton."

---

## Seed Data

Seed `framework_cards` with these categories, 2–3 cards each, written in closer voice:

**Categories:** price_objection, spouse_objection, think_about_it, send_info, trust_objection, timing_objection, competitor_objection, buying_signal_next_steps, buying_signal_desire, coaching_talk_ratio, coaching_trial_close

**Example:**
- Category: price_objection
- Title: "Isolate the Real Concern"
- Response: "I totally hear you. And just so I understand — is it that you don't see the value in what we'd be doing together, or is it more about finding the right way to make the investment work for you right now?"
- Framework: "NEPQ — Consequence Question"
- Keywords: ["expensive", "a lot of money", "can't afford", "too much", "out of my budget", "price", "cost"]
