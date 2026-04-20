import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { NotFoundError } from '../lib/errors.js';
import { env } from '../lib/env.js';
import { createBot, removeBot } from '../services/recall-service.js';
import { stopCallSession } from '../ws/handler.js';

const VALID_MEETING_HOSTS = ['zoom.us', 'meet.google.com', 'us02web.zoom.us', 'us06web.zoom.us'];

function isValidMeetingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return VALID_MEETING_HOSTS.some((h) => parsed.hostname.endsWith(h));
  } catch {
    return false;
  }
}

const launchBody = z.object({
  offer_id: z.string().uuid(),
  meeting_url: z.string().url(),
  prospect_name: z.string().max(120).optional(),
});

const updateCallBody = z.object({
  outcome: z.enum(['closed', 'follow_up', 'lost']).optional(),
  deal_value: z.number().positive().optional(),
});

export async function callsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const isCloser = user.role === 'closer';

    let query = supabase
      .from('calls')
      .select('*, offers(name, price)')
      .order('created_at', { ascending: false });

    if (isCloser) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('org_id', user.org_id);
    }

    const { data, error } = await query;
    if (error) logger.error({ err: error, userId: user.id }, 'Failed to list calls');
    return reply.send(data ?? []);
  });

  app.get('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { id } = request.params as { id: string };

    const { data, error } = await supabase
      .from('calls')
      .select('*, offers(name, price, guarantee, description, common_objections)')
      .eq('id', id)
      .maybeSingle();

    if (error) logger.error({ err: error, callId: id, userId: user.id }, 'Failed to fetch call');
    if (!data) throw new NotFoundError('Call not found');

    const canAccess =
      data.user_id === user.id ||
      (data.org_id === user.org_id && (user.role === 'owner' || user.role === 'admin'));

    if (!canAccess) throw new NotFoundError('Call not found');

    return reply.send(data);
  });

  app.post('/launch', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;

    const body = launchBody.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: 'Invalid request body' });
    }

    const { offer_id, meeting_url, prospect_name } = body.data;

    if (!isValidMeetingUrl(meeting_url)) {
      return reply.status(400).send({
        message: 'Meeting URL must be a valid Zoom or Google Meet link',
      });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('plan, trial_ends_at, settings, name')
      .eq('id', user.org_id)
      .single();

    if (!org) {
      return reply.status(400).send({ message: 'Organization not found' });
    }

    const isTrialActive =
      org.plan === 'trial' && org.trial_ends_at && new Date(org.trial_ends_at) > new Date();
    const isPaidActive = org.plan === 'solo' || org.plan === 'team';

    if (!isTrialActive && !isPaidActive) {
      return reply.status(403).send({
        message: 'Your trial has expired. Upgrade your plan to launch calls.',
      });
    }

    const { data: existingCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['bot_joining', 'live']);

    if (existingCalls && existingCalls.length > 0) {
      return reply.status(409).send({
        message: 'You already have an active call in progress. End it before starting a new one.',
      });
    }

    const { data: offer } = await supabase
      .from('offers')
      .select('id, name, is_active')
      .eq('id', offer_id)
      .eq('org_id', user.org_id)
      .maybeSingle();

    if (!offer) {
      return reply.status(400).send({ message: 'Offer not found in your organization' });
    }
    if (!offer.is_active) {
      return reply.status(400).send({ message: "The selected offer isn't active" });
    }

    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        org_id: user.org_id,
        offer_id,
        meeting_url,
        prospect_name: prospect_name ?? null,
        status: 'bot_joining',
        framework_used: user.default_framework ?? 'nepq',
      })
      .select()
      .single();

    if (callError || !call) {
      logger.error({ err: callError, userId: user.id }, 'Failed to create call record');
      return reply.status(500).send({ message: 'Failed to create call' });
    }

    const settings = org.settings as { bot_display_name?: string } | null;
    const botName = settings?.bot_display_name?.trim() || `${org.name} Notes`;
    const webhookUrl = `${env.API_URL}/webhooks/recall`;

    try {
      const bot = await createBot({ meeting_url, bot_name: botName, webhook_url: webhookUrl });

      await supabase.from('calls').update({ recall_bot_id: bot.id }).eq('id', call.id);

      logger.info(
        { callId: call.id, userId: user.id, orgId: user.org_id, botId: bot.id },
        'Bot deployed for call',
      );

      return reply.status(201).send({ ...call, recall_bot_id: bot.id });
    } catch (err) {
      logger.error({ err, callId: call.id, userId: user.id }, 'Failed to deploy Recall bot');

      await supabase
        .from('calls')
        .update({ status: 'failed', error_message: 'Failed to deploy bot' })
        .eq('id', call.id);

      return reply.status(502).send({
        message: 'Failed to connect to meeting. Check the link and try again.',
      });
    }
  });

  app.patch('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { id } = request.params as { id: string };

    const body = updateCallBody.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: 'Invalid request body' });
    }

    const { data: call } = await supabase
      .from('calls')
      .select('id, user_id, org_id')
      .eq('id', id)
      .maybeSingle();

    if (!call) throw new NotFoundError('Call not found');

    const canAccess =
      call.user_id === user.id ||
      (call.org_id === user.org_id && (user.role === 'owner' || user.role === 'admin'));

    if (!canAccess) throw new NotFoundError('Call not found');

    const updates: Record<string, unknown> = {};
    if (body.data.outcome !== undefined) updates.outcome = body.data.outcome;
    if (body.data.deal_value !== undefined) updates.deal_value = body.data.deal_value;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ message: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, callId: id, userId: user.id }, 'Failed to update call');
      return reply.status(500).send({ message: 'Failed to update call' });
    }

    logger.info({ callId: id, userId: user.id, updates }, 'Call updated');
    return reply.send(data);
  });

  app.post('/:id/end', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { id } = request.params as { id: string };

    const { data: call } = await supabase
      .from('calls')
      .select('id, user_id, org_id, recall_bot_id, status, started_at')
      .eq('id', id)
      .maybeSingle();

    if (!call) throw new NotFoundError('Call not found');

    const canAccess =
      call.user_id === user.id ||
      (call.org_id === user.org_id && (user.role === 'owner' || user.role === 'admin'));

    if (!canAccess) throw new NotFoundError('Call not found');

    if (!['live', 'bot_joining'].includes(call.status)) {
      return reply.status(400).send({ message: 'Call is not active' });
    }

    if (call.recall_bot_id) {
      try {
        await removeBot(call.recall_bot_id);
      } catch (err) {
        logger.error({ err, callId: id, botId: call.recall_bot_id }, 'Bot removal on end — continuing');
      }
    }

    await supabase
      .from('calls')
      .update({ status: 'processing', ended_at: new Date().toISOString() })
      .eq('id', id);

    await stopCallSession(id).catch((err) =>
      logger.error({ err, callId: id }, 'Error stopping call session on end'),
    );

    logger.info({ callId: id, userId: user.id }, 'Call ended — queued for post-call processing');
    return reply.send({ message: 'Call ended successfully' });
  });

  app.delete('/:id/bot', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { id } = request.params as { id: string };

    const { data: call } = await supabase
      .from('calls')
      .select('id, user_id, org_id, recall_bot_id, status, started_at')
      .eq('id', id)
      .maybeSingle();

    if (!call) throw new NotFoundError('Call not found');

    const canRemove =
      call.user_id === user.id ||
      (call.org_id === user.org_id && (user.role === 'owner' || user.role === 'admin'));

    if (!canRemove) throw new NotFoundError('Call not found');

    if (call.recall_bot_id) {
      try {
        await removeBot(call.recall_bot_id);
      } catch (err) {
        logger.error({ err, callId: id, botId: call.recall_bot_id }, 'Bot removal error — continuing');
      }
    }

    const finalStatus = call.started_at ? 'completed' : 'failed';

    await supabase
      .from('calls')
      .update({ status: finalStatus, ended_at: new Date().toISOString() })
      .eq('id', id);

    // Clean up the active audio session if one is running
    await stopCallSession(id).catch((err) =>
      logger.error({ err, callId: id }, 'Error stopping call session on bot removal'),
    );

    logger.info({ callId: id, userId: user.id, finalStatus }, 'Bot removed from call');
    return reply.status(204).send();
  });
}
