import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { NotFoundError } from '../lib/errors.js';

const patchOrgBody = z.object({
  name: z.string().min(1).max(120).optional(),
  settings: z
    .object({
      bot_display_name: z.string().max(80).optional(),
      consent_disclosure_text: z.string().max(500).optional(),
      data_retention_days: z.number().int().min(1).max(365).optional(),
      default_framework: z.enum(['nepq', 'straight_line', 'unicorn_closer', 'custom']).optional(),
    })
    .optional(),
});

export async function orgRoutes(app: FastifyInstance) {
  app.patch('/', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const body = patchOrgBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body' });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.data.name) updates.name = body.data.name;
    if (body.data.settings) updates.settings = body.data.settings;

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', req.currentUser.org_id)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, orgId: req.currentUser.org_id }, 'Failed to update org');
      throw new NotFoundError('Organization not found');
    }

    logger.info({ userId: req.currentUser.id, orgId: data.id }, 'Org updated');
    return reply.send(data);
  });

  app.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', req.currentUser.org_id)
      .single();

    if (error || !data) throw new NotFoundError('Organization not found');
    return reply.send(data);
  });
}
