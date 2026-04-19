import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';

const patchMeBody = z.object({
  full_name: z.string().min(1).max(100).optional(),
  default_framework: z.enum(['nepq', 'straight_line', 'custom']).optional(),
  notification_preferences: z
    .object({
      email_weekly_digest: z.boolean().optional(),
      email_call_summary: z.boolean().optional(),
      email_trial_expiring: z.boolean().optional(),
      email_payment_failed: z.boolean().optional(),
      in_app_cue_card_sound: z.boolean().optional(),
      in_app_low_talk_ratio_alert: z.boolean().optional(),
      in_app_call_duration_warning: z.boolean().optional(),
    })
    .optional(),
});

const patchRoleBody = z.object({
  role: z.enum(['admin', 'closer']),
});

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const body = patchMeBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.data.full_name !== undefined) updates.full_name = body.data.full_name;
    if (body.data.default_framework !== undefined) updates.default_framework = body.data.default_framework;
    if (body.data.notification_preferences !== undefined) {
      // Merge with existing prefs
      const existing = req.currentUser.notification_preferences ?? {};
      updates.notification_preferences = { ...existing, ...body.data.notification_preferences };
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.currentUser.id)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, userId: req.currentUser.id }, 'Failed to update user profile');
      return reply.status(500).send({ message: 'Failed to update profile' });
    }

    logger.info({ userId: req.currentUser.id }, 'User profile updated');
    return reply.send(data);
  });

  // List all org members (owner/admin only)
  app.get('/org-members', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;

    const { data: members, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, last_active_at, created_at')
      .eq('org_id', req.currentUser.org_id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ err: error, orgId: req.currentUser.org_id }, 'Failed to list members');
      return reply.status(500).send({ message: 'Failed to list members' });
    }

    // Get call counts for this week per user
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: callCounts } = await supabase
      .from('calls')
      .select('user_id')
      .eq('org_id', req.currentUser.org_id)
      .gte('created_at', weekAgo)
      .in('status', ['completed', 'live', 'processing']);

    const countMap: Record<string, number> = {};
    for (const row of callCounts ?? []) {
      countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1;
    }

    const result = (members ?? []).map((m) => ({
      ...m,
      calls_this_week: countMap[m.id] ?? 0,
    }));

    return reply.send(result);
  });

  // Change a member's role (owner only, cannot change owner)
  app.patch('/:id/role', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { id } = request.params as { id: string };
    const body = patchRoleBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid role' });

    // Prevent changing own role or changing the owner
    if (id === req.currentUser.id) throw new ForbiddenError('Cannot change your own role');

    const { data: target } = await supabase
      .from('users')
      .select('id, role, org_id')
      .eq('id', id)
      .eq('org_id', req.currentUser.org_id)
      .maybeSingle();

    if (!target) throw new NotFoundError('User not found in your organization');
    if (target.role === 'owner') throw new ForbiddenError('Cannot change the owner\'s role');

    const { data, error } = await supabase
      .from('users')
      .update({ role: body.data.role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, targetId: id }, 'Failed to update role');
      return reply.status(500).send({ message: 'Failed to update role' });
    }

    logger.info({ actorId: req.currentUser.id, targetId: id, newRole: body.data.role }, 'Member role changed');
    return reply.send(data);
  });

  // Remove a member (owner only, cannot remove self or owner)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { id } = request.params as { id: string };

    if (id === req.currentUser.id) throw new ForbiddenError('Cannot remove yourself');

    const { data: target } = await supabase
      .from('users')
      .select('id, role, org_id')
      .eq('id', id)
      .eq('org_id', req.currentUser.org_id)
      .maybeSingle();

    if (!target) throw new NotFoundError('User not found in your organization');
    if (target.role === 'owner') throw new ForbiddenError('Cannot remove the owner');

    // Dissociate user from org (don't delete the auth account)
    const { error } = await supabase
      .from('users')
      .update({ org_id: null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, targetId: id }, 'Failed to remove member');
      return reply.status(500).send({ message: 'Failed to remove member' });
    }

    logger.info({ actorId: req.currentUser.id, removedId: id, orgId: req.currentUser.org_id }, 'Member removed');
    return reply.status(204).send();
  });
}
