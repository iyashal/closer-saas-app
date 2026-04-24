export const OBJECTION_CATEGORIES = [
  'price_objection',
  'spouse_objection',
  'think_about_it',
  'send_info',
  'trust_objection',
  'timing_objection',
  'competitor_objection',
  'buying_signal_next_steps',
  'buying_signal_desire',
  'coaching_talk_ratio',
  'coaching_trial_close',
] as const;

export type ObjectionCategory = (typeof OBJECTION_CATEGORIES)[number];

export const FRAMEWORKS = ['nepq', 'straight_line', 'unicorn_closer', 'custom'] as const;

export const ROLES = ['owner', 'admin', 'closer'] as const;

export const PLAN_NAMES = ['trial', 'starter', 'solo', 'team', 'canceled'] as const;

export const CALL_STATUSES = [
  'scheduled',
  'bot_joining',
  'live',
  'processing',
  'completed',
  'failed',
] as const;

export const TRIAL_DURATION_DAYS = 14;

export const CUE_CARD_DEBOUNCE_SECONDS = 60;

export const CUE_CARD_MAX_VISIBLE = 4;

export const CUE_CARD_MIN_CONFIDENCE = 0.7;

export const TALK_RATIO_WARNING_THRESHOLD = 0.6;

export const TALK_RATIO_WARNING_DURATION_SECONDS = 120;

export const SILENCE_POSITIVE_SECONDS = 8;

export const CALL_DURATION_WARNING_1_MINUTES = 45;

export const CALL_DURATION_WARNING_2_MINUTES = 60;

export const INVITE_EXPIRY_DAYS = 7;

export const TEAM_MIN_SEATS = 2;

export const TRANSCRIPT_BATCH_INTERVAL_MS = 4000;

export const TRANSCRIPT_LATENCY_TARGET_MS = 1500;

export const CUE_CARD_LATENCY_TARGET_MS = 2500;
