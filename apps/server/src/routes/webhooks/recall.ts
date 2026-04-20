import type { FastifyInstance } from 'fastify';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { createNotification } from '../../services/notification-service.js';
import { stopCallSession } from '../../ws/handler.js';

interface RecallWebhookPayload {
  event: string;
  data: {
    bot_id?: string;
    bot?: {
      id: string;
      metadata?: Record<string, unknown>;
    };
    real_time_transcription?: {
      words: Array<{ text: string; start_time: number; end_time: number; participant_id: string }>;
    };
    [key: string]: unknown;
  };
}

async function getCallByBotId(botId: string) {
  const { data } = await supabase
    .from('calls')
    .select('id, user_id, org_id, status, started_at')
    .eq('recall_bot_id', botId)
    .maybeSingle();
  return data;
}

export async function recallWebhookRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const payload = request.body as RecallWebhookPayload;
    const { event, data } = payload;
    const botId = data?.bot_id ?? data?.bot?.id ?? '';

    logger.info({ event, botId }, 'Recall webhook received');

    if (!botId) {
      logger.warn({ payload }, 'Recall webhook missing bot_id');
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
        // Audio pipeline starts when Recall.ai connects to /ws/recall/:callId — no action needed here
        logger.info({ callId, userId, orgId }, 'Bot in call — call is live');
        break;
      }

      case 'bot.call_ended':
      case 'bot.done': {
        await supabase
          .from('calls')
          .update({ status: 'processing', ended_at: new Date().toISOString() })
          .eq('id', callId);
        // Ensure audio session is stopped (idempotent — no-ops if already closed)
        await stopCallSession(callId).catch((err) =>
          logger.error({ err, callId }, 'Error stopping session on bot.call_ended'),
        );
        logger.info({ callId, userId, orgId }, 'Call ended — queued for post-processing');
        // Module 8: trigger post-call processing here
        break;
      }

      case 'bot.fatal_error':
      case 'bot.error': {
        const errorMsg = (data?.sub_code as string) ?? (data?.message as string) ?? 'Unknown error';
        await supabase
          .from('calls')
          .update({ status: 'failed', error_message: errorMsg })
          .eq('id', callId);
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
