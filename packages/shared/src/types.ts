export type UserRole = 'owner' | 'admin' | 'closer';

export type OrgPlan = 'trial' | 'solo' | 'team' | 'canceled';

export type CallStatus =
  | 'scheduled'
  | 'bot_joining'
  | 'live'
  | 'processing'
  | 'completed'
  | 'failed';

export type CallOutcome = 'closed' | 'follow_up' | 'lost' | null;

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type NotificationChannel = 'in_app' | 'email' | 'both';

export type ObjectionType =
  | 'price'
  | 'spouse'
  | 'think_about_it'
  | 'send_info'
  | 'trust'
  | 'timing'
  | 'competitor'
  | 'none';

export type BuyingSignal =
  | 'asking_next_steps'
  | 'asking_start_date'
  | 'asking_guarantee'
  | 'asking_details'
  | 'expressing_desire'
  | 'none';

export type CoachingNudge =
  | 'talk_ratio_high'
  | 'missed_buying_signal'
  | 'pitched_too_early'
  | 'good_trial_close_moment'
  | 'let_silence_work'
  | 'none';

export type Framework = 'nepq' | 'straight_line' | 'custom';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: OrgPlan;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  max_seats: number;
  settings: {
    bot_display_name: string;
    consent_disclosure_text: string;
    data_retention_days: number;
  };
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  org_id: string;
  role: UserRole;
  zoom_access_token: string | null;
  zoom_refresh_token: string | null;
  default_framework: Framework;
  notification_preferences: NotificationPreferences;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  email_weekly_digest: boolean;
  email_call_summary: boolean;
  email_trial_expiring: boolean;
  email_payment_failed: boolean;
  in_app_cue_card_sound: boolean;
  in_app_low_talk_ratio_alert: boolean;
  in_app_call_duration_warning: boolean;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Offer {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  price: number;
  guarantee: string | null;
  common_objections: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Call {
  id: string;
  user_id: string;
  org_id: string;
  offer_id: string;
  recall_bot_id: string | null;
  meeting_url: string;
  prospect_name: string | null;
  prospect_email: string | null;
  status: CallStatus;
  outcome: CallOutcome;
  deal_value: number | null;
  deal_health_score: number | null;
  talk_ratio_closer: number | null;
  talk_ratio_prospect: number | null;
  duration_seconds: number | null;
  summary: string | null;
  follow_up_email: string | null;
  what_you_should_have_said: WhatYouShouldHaveSaid[] | null;
  next_steps: string[] | null;
  recording_url: string | null;
  framework_used: Framework;
  cue_cards_shown_count: number;
  cue_cards_used_count: number;
  error_message: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface WhatYouShouldHaveSaid {
  timestamp: number;
  objection: string;
  your_response: string;
  better_response: string;
}

export interface TranscriptLine {
  id: string;
  call_id: string;
  speaker: 'closer' | 'prospect';
  content: string;
  timestamp_ms: number;
  is_objection: boolean;
  is_buying_signal: boolean;
  objection_type: ObjectionType | null;
  created_at: string;
}

export interface FrameworkCard {
  id: string;
  org_id: string | null;
  framework: Framework;
  category: string;
  title: string;
  trigger_keywords: string[];
  suggested_response: string;
  framework_reference: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CueCardShown {
  id: string;
  call_id: string;
  card_id: string;
  trigger_text: string | null;
  shown_at: string;
  was_used: boolean;
  dismissed: boolean;
  confidence: number | null;
}

export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  channel: NotificationChannel;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface RealtimeDetectionResult {
  objection_type: ObjectionType;
  buying_signal: BuyingSignal;
  coaching_nudge: CoachingNudge;
  confidence: number;
}
