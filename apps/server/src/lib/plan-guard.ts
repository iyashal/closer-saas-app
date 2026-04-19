import type { FastifyRequest, FastifyReply } from 'fastify';
import type { OrgPlan } from '@closer/shared';
import { ForbiddenError } from './errors.js';
import { supabase } from './supabase.js';

export function requirePlan(...plans: OrgPlan[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = (request as FastifyRequest & { currentUser: { org_id: string } }).currentUser;
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', user.org_id)
      .single();
    if (!org || !plans.includes(org.plan as OrgPlan)) throw new ForbiddenError();
  };
}

export function requireActivePlan() {
  return requirePlan('solo', 'team', 'trial');
}
