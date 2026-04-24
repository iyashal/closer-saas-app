import type { FastifyRequest, FastifyReply } from 'fastify';
import { PLANS, meetsMinimumPlan, type PlanId } from '@closer/shared';
import { supabase } from './supabase.js';
import { logger } from './logger.js';
import type { RequestWithUser } from './auth-middleware.js';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', null];

export function requireActivePlan() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as RequestWithUser).currentUser;

    const { data: org } = await supabase
      .from('organizations')
      .select('plan, trial_ends_at, subscription_status')
      .eq('id', user.org_id)
      .single();

    if (!org) return reply.status(402).send({ error: 'plan_required', reason: 'no_org', current_plan: null });

    const plan = (org.plan ?? 'trial') as PlanId;

    const isActiveTrial =
      plan === 'trial' && org.trial_ends_at && new Date(org.trial_ends_at) > new Date();

    const isActivePaid =
      ['starter', 'solo', 'team'].includes(plan) &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(org.subscription_status as string | null);

    if (!isActiveTrial && !isActivePaid) {
      const reason = plan === 'trial' ? 'trial_expired' : 'subscription_inactive';
      return reply.status(402).send({ error: 'plan_required', reason, current_plan: plan });
    }
  };
}

export function requirePlan(minPlan: PlanId) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as RequestWithUser).currentUser;

    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', user.org_id)
      .single();

    const current = (org?.plan ?? 'trial') as PlanId;

    if (!meetsMinimumPlan(current, minPlan)) {
      return reply.status(402).send({
        error: 'plan_required',
        required_plan: minPlan,
        current_plan: current,
      });
    }
  };
}

export function requireTeamFeatures() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as RequestWithUser).currentUser;

    const { data: org } = await supabase
      .from('organizations')
      .select('plan, subscription_status')
      .eq('id', user.org_id)
      .single();

    const plan = (org?.plan ?? 'trial') as PlanId;
    const isTeamActive =
      plan === 'team' &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(org?.subscription_status as string | null);

    if (!isTeamActive) {
      return reply.status(402).send({
        error: 'plan_required',
        feature: 'team_features',
        required_plan: 'team',
        current_plan: plan,
      });
    }
  };
}

export function checkStarterDailyLimit() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as RequestWithUser).currentUser;

    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', user.org_id)
      .single();

    if (!org || org.plan !== 'starter') return;

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('counted_for_daily_limit', true)
      .gte('created_at', todayStart.toISOString());

    const limit = PLANS.starter.calls_per_day as number;

    if ((count ?? 0) >= limit) {
      logger.info({ userId: user.id, orgId: user.org_id, count }, 'Starter daily call limit reached');
      return reply.status(402).send({
        error: 'daily_limit_reached',
        limit,
        resource: 'calls',
      });
    }
  };
}
