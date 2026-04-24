import type { FastifyInstance } from 'fastify';
import { env } from '../../lib/env.js';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { createNotification } from '../../services/notification-service.js';
import {
  stripe,
  syncSubscriptionToOrg,
  handleSubscriptionDeleted,
} from '../../services/stripe-service.js';
import type Stripe from 'stripe';

export async function stripeWebhookRoutes(app: FastifyInstance) {
  // Scope a buffer parser to this plugin only — Approach B for raw body access.
  // Other routes continue to use Fastify's default JSON parser.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  );

  app.post('/', async (req, reply) => {
    const rawBody = req.body as Buffer;

    // Verify Approach B is working — rawBody must be a Buffer
    if (!Buffer.isBuffer(rawBody)) {
      logger.error({ bodyType: typeof rawBody }, 'Stripe webhook: body is not a Buffer — raw body parser not active');
      return reply.status(400).send({ error: 'invalid_body' });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      return reply.status(400).send({ error: 'missing_stripe_signature' });
    }

    let event: Stripe.Event;
    try {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        // Dev fallback: parse JSON without signature verification
        logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)');
        event = JSON.parse(rawBody.toString()) as Stripe.Event;
      } else {
        event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      }
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: 'invalid_signature' });
    }

    // Idempotency: skip duplicate events
    const { data: existing } = await supabase
      .from('billing_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();

    if (existing) {
      logger.info({ eventId: event.id, eventType: event.type }, 'Stripe webhook duplicate — skipping');
      return reply.send({ received: true, duplicate: true });
    }

    // Resolve org for logging and billing_events FK
    let orgId: string | null = null;
    try {
      orgId = await resolveOrgId(event);
    } catch {
      // org resolution failure is non-fatal; log and continue
    }

    // Record the event before processing (fire-and-forget on insert failure)
    await supabase
      .from('billing_events')
      .insert({
        org_id: orgId,
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      })
      .then(({ error }) => {
        if (error) logger.warn({ err: error, eventId: event.id }, 'Failed to insert billing_event record');
      });

    try {
      await processEvent(event, orgId);
    } catch (err) {
      // Never return 500 — log and return 200 to avoid Stripe retry storms
      logger.error({ err, eventId: event.id, eventType: event.type, orgId }, 'Error processing Stripe webhook event');
    }

    return reply.send({ received: true });
  });
}

// ─── Event processing ─────────────────────────────────────────────────────────

async function resolveOrgId(event: Stripe.Event): Promise<string | null> {
  let customerId: string | null = null;

  const obj = event.data.object as unknown as Record<string, unknown>;
  if (typeof obj['customer'] === 'string') customerId = obj['customer'];

  if (!customerId) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return org?.id ?? null;
}

async function processEvent(event: Stripe.Event, orgId: string | null): Promise<void> {
  logger.info({ eventId: event.id, eventType: event.type, orgId }, 'Processing Stripe event');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        await syncSubscriptionToOrg(subscription);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionToOrg(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer).id;

      await supabase
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId);

      if (orgId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', orgId)
          .single();

        if (org?.owner_id) {
          await createNotification({
            user_id: org.owner_id,
            org_id: orgId,
            type: 'payment_failed',
            title: 'Payment failed',
            body: 'Your payment failed. Update your card to avoid interruption.',
            channel: 'both',
            metadata: { invoice_id: invoice.id },
          });
        }
      }
      logger.info({ customerId, orgId }, 'Invoice payment failed — org marked past_due');
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer).id;

      // Restore active status if previously past_due
      await supabase
        .from('organizations')
        .update({ subscription_status: 'active' })
        .eq('stripe_customer_id', customerId)
        .eq('subscription_status', 'past_due');

      logger.info({ customerId, orgId }, 'Invoice payment succeeded');
      break;
    }

    default:
      logger.debug({ eventType: event.type }, 'Unhandled Stripe event type');
  }
}
