import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { PLANS, type PlanId } from '@closer/shared';
import {
  createCheckoutSession,
  createPortalSession,
  createOrGetCustomer,
} from '../services/stripe-service.js';

const checkoutBody = z.object({
  plan: z.enum(['starter', 'solo', 'team']),
  interval: z.enum(['month', 'year']),
  seats: z.number().int().min(2).optional(),
});

export async function billingRoutes(app: FastifyInstance) {
  // GET /billing/plan — any authenticated user
  app.get('/plan', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;

    const { data: org } = await supabase
      .from('organizations')
      .select('plan, billing_interval, subscription_status, current_period_end, trial_ends_at, cancel_at_period_end, max_seats')
      .eq('id', user.org_id)
      .single();

    if (!org) return reply.status(404).send({ message: 'Organization not found' });

    const planId = (org.plan ?? 'trial') as PlanId;
    const planDef = (planId in PLANS) ? PLANS[planId as keyof typeof PLANS] : PLANS.trial;

    const now = Date.now();
    const trialEndsAt = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
    const isTrial = planId === 'trial';
    const isTrialing = isTrial && trialEndsAt !== null && trialEndsAt.getTime() > now;
    const daysLeftInTrial = isTrialing
      ? Math.max(0, Math.ceil((trialEndsAt!.getTime() - now) / (1000 * 60 * 60 * 24)))
      : null;

    let callsUsedToday: number | null = null;
    if (planId === 'starter') {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('counted_for_daily_limit', true)
        .gte('created_at', todayStart.toISOString());
      callsUsedToday = count ?? 0;
    }

    return reply.send({
      plan: planId,
      billing_interval: org.billing_interval ?? null,
      subscription_status: org.subscription_status ?? null,
      current_period_end: org.current_period_end ?? null,
      trial_ends_at: org.trial_ends_at ?? null,
      cancel_at_period_end: org.cancel_at_period_end ?? false,
      max_seats: org.max_seats ?? 1,
      limits: {
        calls_per_day: planDef.calls_per_day,
        max_users: planDef.max_users,
        team_features: planDef.team_features,
      },
      is_trialing: isTrialing,
      days_left_in_trial: daysLeftInTrial,
      calls_used_today: callsUsedToday,
    });
  });

  // POST /billing/checkout — Owner only
  app.post(
    '/checkout',
    { preHandler: [authMiddleware, requireRole('owner')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;

      const parsed = checkoutBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: 'Invalid request body' });
      }
      const { plan, interval, seats } = parsed.data;

      if (plan === 'team' && !seats) {
        return reply.status(400).send({ message: 'seats required for team plan' });
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, owner_id, stripe_customer_id')
        .eq('id', user.org_id)
        .single();

      if (!org) return reply.status(404).send({ message: 'Organization not found' });

      try {
        const session = await createCheckoutSession({
          orgId: org.id,
          orgName: org.name,
          ownerEmail: user.email,
          plan,
          interval,
          seats,
        });

        logger.info({ orgId: org.id, plan, interval, userId: user.id }, 'Checkout session created');
        return reply.send({ checkout_url: session.url });
      } catch (err) {
        logger.error({ err, orgId: org.id, plan }, 'Failed to create checkout session');
        return reply.status(500).send({ message: 'Failed to create checkout session' });
      }
    },
  );

  // POST /billing/portal — Owner only
  app.post(
    '/portal',
    { preHandler: [authMiddleware, requireRole('owner')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, stripe_customer_id')
        .eq('id', user.org_id)
        .single();

      if (!org) return reply.status(404).send({ message: 'Organization not found' });

      if (!org.stripe_customer_id) {
        // Create customer first so portal can be accessed without prior subscription
        await createOrGetCustomer(org.id, org.name, user.email);
        const { data: updated } = await supabase
          .from('organizations')
          .select('stripe_customer_id')
          .eq('id', org.id)
          .single();
        if (!updated?.stripe_customer_id) {
          return reply.status(400).send({ message: 'No subscription found — subscribe first' });
        }
        org.stripe_customer_id = updated.stripe_customer_id;
      }

      try {
        const session = await createPortalSession(org.stripe_customer_id);
        logger.info({ orgId: org.id, userId: user.id }, 'Billing portal session created');
        return reply.send({ portal_url: session.url });
      } catch (err) {
        logger.error({ err, orgId: org.id }, 'Failed to create portal session');
        return reply.status(500).send({ message: 'Failed to open billing portal' });
      }
    },
  );

  // POST /billing/dev/simulate-event — dev only
  if (process.env['NODE_ENV'] !== 'production') {
    app.post('/dev/simulate-event', { preHandler: authMiddleware }, async (request, reply) => {
      const { event_type, org_id } = request.body as { event_type: string; org_id: string };
      logger.info({ event_type, org_id }, '[DEV] Simulating billing event');
      return reply.send({ simulated: true, event_type, org_id });
    });
  }
}
