import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { Offer } from '@closer/shared';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { buildPostCallPrompt } from '../prompts/post-call-summary.js';
import { buildFollowUpPrompt } from '../prompts/follow-up-email.js';

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

export const PostCallResultSchema = z.object({
  summary: z.string(),
  objection_log: z.array(PostCallObjectionEntrySchema).default([]),
  deal_health_score: z.number().min(0).max(100),
  deal_health_reasoning: z.string(),
  next_steps: z.array(z.string()).min(1),
  follow_up_email: z.string(),
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
    'none',
  ]),
  confidence: z.number().min(0).max(1),
});

export type RealtimeDetectionResult = z.infer<typeof RealtimeDetectionSchema>;

// ─── Real-time detection (Module 6) ──────────────────────────────────────────

export async function detectObjection(
  transcriptBuffer: string,
  offer: Offer,
  framework: string,
): Promise<RealtimeDetectionResult | null> {
  const systemPrompt = `You are an expert high-ticket sales call analyzer for CloseForce.io. You are analyzing a LIVE sales call.

The closer is selling: ${offer.name}
Price: $${offer.price}
Description: ${offer.description ?? ''}
Guarantee: ${offer.guarantee ?? ''}
Known objections for this offer: ${offer.common_objections?.join(', ') || 'none'}
Framework: ${framework}

Analyze the latest transcript and classify what is happening RIGHT NOW.

Rules:
- Only flag if genuinely confident. False positives are WORSE than misses — a wrong cue card mid-close distracts and breaks flow.
- Confidence 0.8+ only when classification is unambiguous.
- "none" is correct most of the time. Rapport, discovery, and neutral discussion are not flagged.
- Distinguish real objections from questions. "How much is it?" = curiosity. "That's way more than I expected" = price objection.

Respond ONLY with valid JSON. No markdown, no explanation.`;

  const userContent = `Recent transcript:\n${transcriptBuffer}`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
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
    max_tokens: 4096,
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
