import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { NotFoundError } from '../lib/errors.js';

const createOfferBody = z.object({
  name: z.string().min(1).max(120),
  price: z.number().positive(),
  guarantee: z.string().max(300).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  common_objections: z.array(z.string()).default([]),
});

const patchOfferBody = createOfferBody.partial().extend({
  is_active: z.boolean().optional(),
});

export async function offersRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('org_id', req.currentUser.org_id)
      .order('created_at', { ascending: false });

    if (error) logger.error({ err: error, orgId: req.currentUser.org_id }, 'Failed to list offers');
    return reply.send(data ?? []);
  });

  app.post('/', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const body = createOfferBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });

    const { data, error } = await supabase
      .from('offers')
      .insert({
        ...body.data,
        org_id: req.currentUser.org_id,
        created_by: req.currentUser.id,
      })
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, userId: req.currentUser.id }, 'Failed to create offer');
      return reply.status(500).send({ message: 'Failed to create offer' });
    }

    logger.info({ userId: req.currentUser.id, offerId: data.id }, 'Offer created');
    return reply.status(201).send(data);
  });

  app.patch('/:id', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { id } = request.params as { id: string };
    const body = patchOfferBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body' });

    const { data, error } = await supabase
      .from('offers')
      .update(body.data)
      .eq('id', id)
      .eq('org_id', req.currentUser.org_id)
      .select()
      .single();

    if (error || !data) throw new NotFoundError('Offer not found');
    return reply.send(data);
  });

  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { id } = request.params as { id: string };

    const { error } = await supabase
      .from('offers')
      .update({ is_active: false })
      .eq('id', id)
      .eq('org_id', req.currentUser.org_id);

    if (error) throw new NotFoundError('Offer not found');
    logger.info({ userId: req.currentUser.id, offerId: id }, 'Offer deactivated');
    return reply.status(204).send();
  });
}
