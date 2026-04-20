import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { Offer } from '@closer/shared';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { buildPostCallPrompt } from '../prompts/post-call-summary.js';
import { buildFollowUpPrompt } from '../prompts/follow-up-email.js';
import { buildRealtimeDetectionPrompt } from '../prompts/realtime-detection.js';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function extractTextContent(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PostCallObjectionEntrySchema = z.object({
  timestamp_ms: z.number().default(0),
  what_prospect_said: z.string(),
  how_closer_handled: z.string(),
  better_alternative: z.string(),
});

const LeadershipEnergiesSchema = z.object({
  abundance: z.number().min(0).max(10),
  direction: z.number().min(0).max(10),
  non_attachment: z.number().min(0).max(10),
  responsibility: z.number().min(0).max(10),
  curiosity: z.number().min(0).max(10),
});

const RationalizationMissedSchema = z.object({
  timestamp_ms: z.number().default(0),
  what_prospect_said: z.string(),
  what_closer_should_have_said: z.string(),
});

const UnicornCloserGradeSchema = z.object({
  presence_score: z.number().min(0).max(100),
  presence_notes: z.string(),
  frame_control_score: z.number().min(0).max(100),
  frame_control_notes: z.string(),
  rationalization_catches: z.number().min(0),
  rationalizations_missed: z.array(RationalizationMissedSchema).default([]),
  talk_ratio_grade: z.string(),
  dot_connecting_score: z.number().min(0).max(100),
  dot_connecting_notes: z.string(),
  summary_pauses_used: z.number().min(0),
  three_whys_depth: z.string(),
  leadership_energies: LeadershipEnergiesSchema,
  top_three_improvements: z.array(z.string()).length(3),
});

export const PostCallResultSchema = z.object({
  summary: z.string(),
  objection_log: z.array(PostCallObjectionEntrySchema).default([]),
  deal_health_score: z.number().min(0).max(100),
  deal_health_reasoning: z.string().default(''),
  next_steps: z.array(z.string()).min(1),
  follow_up_email: z.string(),
  unicorn_closer_grade: UnicornCloserGradeSchema.optional(),
});

export type PostCallResult = z.infer<typeof PostCallResultSchema>;

const RealtimeDetectionSchema = z.object({
  objection_type: z.enum([
    'price',
    'spouse',
    'think_about_it',
    'send_info',
    'trust',
    'timing',
    'competitor',
    'none',
  ]),
  buying_signal: z.enum([
    'asking_next_steps',
    'asking_start_date',
    'asking_guarantee',
    'asking_details',
    'expressing_desire',
    'none',
  ]),
  coaching_nudge: z.enum([
    'talk_ratio_high',
    'missed_buying_signal',
    'pitched_too_early',
    'good_trial_close_moment',
    'let_silence_work',
    'rationalization_detected',
    'minimizing_language',
    'closer_assumption',
    'missed_emotional_thread',
    'closer_broke_frame',
    'surface_level_acceptance',
    'missed_summary_pause',
    'none',
  ]),
  coaching_detail: z.string().default(''),
  confidence: z.number().min(0).max(1),
});

export type RealtimeDetectionResult = z.infer<typeof RealtimeDetectionSchema>;

// ─── Real-time detection (Module 6) ──────────────────────────────────────────

export async function detectObjection(
  transcriptBuffer: readonly string[],
  offer: Offer,
  framework: string,
): Promise<RealtimeDetectionResult | null> {
  const { system, userContent } = buildRealtimeDetectionPrompt(offer, framework, transcriptBuffer);

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = stripJsonFences(extractTextContent(response));
    const parsed = RealtimeDetectionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      logger.warn({ errors: parsed.error.flatten() }, 'Real-time detection schema mismatch');
      return null;
    }
    return parsed.data;
  } catch (err) {
    logger.error({ err }, 'Real-time detection Claude call failed');
    return null;
  }
}

// ─── Post-call summary (Module 8) ────────────────────────────────────────────

async function callSonnetForSummary(
  transcript: string,
  offer: Offer,
  framework: string,
): Promise<PostCallResult> {
  const prompt = buildPostCallPrompt(transcript, offer, framework);

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = stripJsonFences(extractTextContent(response));
  const parsed = PostCallResultSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    logger.warn({ errors: parsed.error.flatten() }, 'Post-call summary schema mismatch — using raw');
    throw new Error('Post-call summary response failed schema validation');
  }

  return parsed.data;
}

export async function generatePostCallSummary(
  transcript: string,
  offer: Offer,
  framework: string,
  context: { callId: string; userId: string; orgId: string },
): Promise<PostCallResult | null> {
  const startMs = Date.now();

  try {
    const result = await callSonnetForSummary(transcript, offer, framework);
    logger.info(
      { ...context, duration_ms: Date.now() - startMs },
      'Post-call summary generated',
    );
    return result;
  } catch (firstErr) {
    logger.warn(
      { err: firstErr, ...context },
      'Post-call summary failed on first attempt — retrying',
    );

    try {
      const result = await callSonnetForSummary(transcript, offer, framework);
      logger.info(
        { ...context, duration_ms: Date.now() - startMs },
        'Post-call summary generated on retry',
      );
      return result;
    } catch (secondErr) {
      logger.error(
        { err: secondErr, ...context, duration_ms: Date.now() - startMs },
        'Post-call summary failed after retry',
      );
      return null;
    }
  }
}

// ─── Follow-up email (Module 8) ───────────────────────────────────────────────

export async function generateFollowUpEmail(
  transcript: string,
  prospectName: string,
  offer: Offer,
  outcome: string,
  context: { callId: string; userId: string; orgId: string },
): Promise<string | null> {
  const startMs = Date.now();
  const prompt = buildFollowUpPrompt(transcript, prospectName, offer, outcome);

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const email = extractTextContent(response).trim();
    logger.info(
      { ...context, duration_ms: Date.now() - startMs },
      'Follow-up email generated',
    );
    return email || null;
  } catch (err) {
    logger.error(
      { err, ...context, duration_ms: Date.now() - startMs },
      'Follow-up email generation failed',
    );
    return null;
  }
}
