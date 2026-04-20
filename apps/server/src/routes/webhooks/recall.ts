import type { FastifyInstance } from 'fastify';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { createNotification } from '../../services/notification-service.js';
import { processCall } from '../../services/post-call-service.js';
import {
  startCallSession,
  stopCallSession,
  getSession,
  getCallIdForBot,
} from '../../ws/handler.js';

// ─── Payload types ────────────────────────────────────────────────────────────

interface RecallWord {
  text: string;
  start_timestamp: { relative: number };
  end_timestamp: { relative: number } | null;
}

interface RecallParticipant {
  id: number;
  name: string | null;
  is_host: boolean;
  platform: string | null;
  extra_data: Record<string, unknown>;
  email: string | null;
}

interface RecallTranscriptEventPayload {
  event: 'transcript.data' | 'transcript.partial_data';
  data: {
    data: {
      words: RecallWord[];
      language_code?: string;
      participant: RecallParticipant;
    };
    bot: { id: string; metadata?: Record<string, unknown> };
    transcript?: { id: string };
    recording?: { id: string };
    realtime_endpoint?: { id: string };
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCallByBotId(botId: string) {
  const { data } = await supabase
    .from('calls')
    .select('id, user_id, org_id, status, started_at')
    .eq('recall_bot_id', botId)
    .maybeSingle();
  return data;
}

/**
 * Handle transcript.data and transcript.partial_data events.
 * Uses the in-memory botId→callId map to avoid a DB query per event.
 */
function handleTranscriptEvent(payload: RecallTranscriptEventPayload): void {
  const isFinal = payload.event === 'transcript.data';
  const botId = payload.data?.bot?.id;
  if (!botId) return;

  const callId = getCallIdForBot(botId);
  if (!callId) {
    logger.warn({ event: payload.event, botId }, 'No active session for transcript event — skipping');
    return;
  }

  const session = getSession(callId);
  if (!session) {
    logger.warn({ event: payload.event, callId }, 'Session not found for transcript event');
    return;
  }

  const words = payload.data?.data?.words ?? [];
  const participant = payload.data?.data?.participant;
  const text = words.map((w) => w.text).join(' ').trim();
  if (!text) return;

  // is_host identifies the closer — they created the meeting and were present before the bot joined
  const speaker: 'closer' | 'prospect' = participant?.is_host === true ? 'closer' : 'prospect';
  const timestampMs = Math.floor((words[0]?.start_timestamp?.relative ?? 0) * 1_000);

  session.handleTranscriptLine(speaker, text, words.length, timestampMs, isFinal);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function recallWebhookRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const rawPayload = request.body as { event: string; data: Record<string, unknown> };
    const event = rawPayload?.event ?? '';
    const data = rawPayload?.data ?? {};

    // High-frequency transcript events: handle in-memory, skip DB lookup
    if (event === 'transcript.data' || event === 'transcript.partial_data') {
      handleTranscriptEvent(rawPayload as unknown as RecallTranscriptEventPayload);
      return reply.status(200).send({ ok: true });
    }

    const botId = (data?.bot_id ?? (data?.bot as { id?: string } | undefined)?.id ?? '') as string;

    logger.info({ event, botId }, 'Recall webhook received');

    if (!botId) {
      logger.warn({ event }, 'Recall webhook missing bot_id');
      return reply.status(200).send({ ok: true });
    }

    const call = await getCallByBotId(botId);

    if (!call) {
      logger.warn({ event, botId }, 'No call found for Recall bot');
      return reply.status(200).send({ ok: true });
    }

    const { id: callId, user_id: userId, org_id: orgId } = call;

    switch (event) {
      case 'bot.joining_call':
      case 'bot.joining': {
        await supabase.from('calls').update({ status: 'bot_joining' }).eq('id', callId);
        logger.info({ callId, userId, orgId, event }, 'Bot joining call');
        break;
      }

      case 'bot.in_waiting_room': {
        await supabase.from('calls').update({ status: 'bot_joining' }).eq('id', callId);
        logger.info({ callId, userId, orgId }, 'Bot in waiting room');

        await createNotification({
          user_id: userId,
          org_id: orgId,
          type: 'bot_waiting_room',
          title: 'Bot is in the waiting room',
          body: 'Bot is in the waiting room — admit it to start.',
          channel: 'in_app',
          metadata: { call_id: callId },
        });
        break;
      }

      case 'bot.in_call_recording':
      case 'bot.in_call': {
        const now = new Date().toISOString();
        await supabase
          .from('calls')
          .update({ status: 'live', started_at: now })
          .eq('id', callId);

        // Start the session — transcript events will start arriving shortly
        await startCallSession(callId, userId, orgId, botId).catch((err) =>
          logger.error({ err, callId }, 'Failed to start call session'),
        );

        logger.info({ callId, userId, orgId }, 'Bot in call — session started');
        break;
      }

      case 'bot.call_ended':
      case 'bot.done': {
        await supabase
          .from('calls')
          .update({ status: 'processing', ended_at: new Date().toISOString() })
          .eq('id', callId);

        await stopCallSession(callId).catch((err) =>
          logger.error({ err, callId }, 'Error stopping session on bot.call_ended'),
        );

        // Fire-and-forget — webhook must respond quickly
        processCall(callId).catch((err) =>
          logger.error({ err, callId }, 'processCall failed after bot.call_ended'),
        );

        logger.info({ callId, userId, orgId }, 'Call ended — post-call processing triggered');
        break;
      }

      case 'bot.fatal_error':
      case 'bot.error': {
        const errorMsg =
          (data?.sub_code as string | undefined) ??
          (data?.message as string | undefined) ??
          'Unknown error';

        await supabase
          .from('calls')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', callId);

        await stopCallSession(callId).catch((err) =>
          logger.error({ err, callId }, 'Error stopping session on bot error'),
        );

        logger.error({ callId, userId, orgId, errorMsg }, 'Bot error');

        await createNotification({
          user_id: userId,
          org_id: orgId,
          type: 'bot_failed',
          title: "Bot couldn't join your meeting",
          body: "Bot couldn't join your meeting. Check the link and try again.",
          channel: 'in_app',
          metadata: { call_id: callId, error: errorMsg },
        });
        break;
      }

      default:
        logger.debug({ event, botId, callId }, 'Unhandled Recall event');
    }

    return reply.status(200).send({ ok: true });
  });
}
