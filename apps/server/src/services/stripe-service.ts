import Stripe from 'stripe';
import { env } from '../lib/env.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { createNotification } from './notification-service.js';
import type { PlanId } from '@closer/shared';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// ─── Price ID helpers ─────────────────────────────────────────────────────────

export function getPriceId(plan: 'starter' | 'solo' | 'team', interval: 'month' | 'year'): string {
  const map: Record<string, string> = {
    'starter:month': env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    'starter:year': env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    'solo:month': env.STRIPE_SOLO_MONTHLY_PRICE_ID,
    'solo:year': env.STRIPE_SOLO_ANNUAL_PRICE_ID,
    'team:month': env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    'team:year': env.STRIPE_TEAM_ANNUAL_PRICE_ID,
  };
  const priceId = map[`${plan}:${interval}`];
  if (!priceId) throw new Error(`Missing Stripe price ID for plan=${plan} interval=${interval}`);
  return priceId;
}

export function getPlanFromPriceId(priceId: string): { plan: PlanId; interval: 'month' | 'year' } | null {
  const map: Record<string, { plan: PlanId; interval: 'month' | 'year' }> = {};
  if (env.STRIPE_STARTER_MONTHLY_PRICE_ID) map[env.STRIPE_STARTER_MONTHLY_PRICE_ID] = { plan: 'starter', interval: 'month' };
  if (env.STRIPE_STARTER_ANNUAL_PRICE_ID) map[env.STRIPE_STARTER_ANNUAL_PRICE_ID] = { plan: 'starter', interval: 'year' };
  if (env.STRIPE_SOLO_MONTHLY_PRICE_ID) map[env.STRIPE_SOLO_MONTHLY_PRICE_ID] = { plan: 'solo', interval: 'month' };
  if (env.STRIPE_SOLO_ANNUAL_PRICE_ID) map[env.STRIPE_SOLO_ANNUAL_PRICE_ID] = { plan: 'solo', interval: 'year' };
  if (env.STRIPE_TEAM_MONTHLY_PRICE_ID) map[env.STRIPE_TEAM_MONTHLY_PRICE_ID] = { plan: 'team', interval: 'month' };
  if (env.STRIPE_TEAM_ANNUAL_PRICE_ID) map[env.STRIPE_TEAM_ANNUAL_PRICE_ID] = { plan: 'team', interval: 'year' };
  return map[priceId] ?? null;
}

// ─── Customer management ──────────────────────────────────────────────────────

export async function createOrGetCustomer(
  orgId: string,
  orgName: string,
  ownerEmail: string,
): Promise<string> {
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single();

  if (org?.stripe_customer_id) return org.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: orgName,
    metadata: { org_id: orgId },
  });

  await supabase
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orgId);

  logger.info({ orgId, customerId: customer.id }, 'Stripe customer created');
  return customer.id;
}

// ─── Checkout & portal ────────────────────────────────────────────────────────

export async function createCheckoutSession(params: {
  orgId: string;
  orgName: string;
  ownerEmail: string;
  plan: 'starter' | 'solo' | 'team';
  interval: 'month' | 'year';
  seats?: number;
}): Promise<Stripe.Checkout.Session> {
  const customerId = await createOrGetCustomer(params.orgId, params.orgName, params.ownerEmail);
  const priceId = getPriceId(params.plan, params.interval);
  const quantity = params.plan === 'team' ? Math.max(2, params.seats ?? 2) : 1;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity }],
    success_url: env.CHECKOUT_SUCCESS_URL,
    cancel_url: env.CHECKOUT_CANCEL_URL,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { org_id: params.orgId },
    },
  });

  logger.info({ orgId: params.orgId, plan: params.plan, interval: params.interval }, 'Checkout session created');
  return session;
}

export async function createPortalSession(customerId: string): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: env.BILLING_PORTAL_RETURN_URL,
  });
}

// ─── Subscription sync ────────────────────────────────────────────────────────

export async function syncSubscriptionToOrg(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, plan')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!org) {
    logger.warn({ customerId, subscriptionId: subscription.id }, 'syncSubscriptionToOrg: no org found for customer');
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const planResult = priceId ? getPlanFromPriceId(priceId) : null;
  const plan = planResult?.plan ?? org.plan;
  const interval = planResult?.interval ?? null;
  const quantity = item?.quantity ?? 1;

  await supabase
    .from('organizations')
    .update({
      plan,
      billing_interval: interval,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_subscription_id: subscription.id,
      ...(plan === 'team' ? { max_seats: quantity } : {}),
    })
    .eq('id', org.id);

  logger.info(
    { orgId: org.id, plan, status: subscription.status, interval },
    'Subscription synced to org',
  );
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const { data: org } = await supabase
    .from('organizations')
    .select('id, owner_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!org) {
    logger.warn({ customerId }, 'handleSubscriptionDeleted: no org found for customer');
    return;
  }

  await supabase
    .from('organizations')
    .update({
      plan: 'canceled',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
    })
    .eq('id', org.id);

  await createNotification({
    user_id: org.owner_id,
    org_id: org.id,
    type: 'subscription_canceled',
    title: 'Subscription canceled',
    body: 'Your subscription has been canceled. You can resubscribe at any time.',
    channel: 'both',
  });

  logger.info({ orgId: org.id }, 'Subscription deleted — org marked canceled');
}
