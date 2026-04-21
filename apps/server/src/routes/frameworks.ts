import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';

const VALID_FRAMEWORKS = ['nepq', 'straight_line', 'unicorn_closer'] as const;
const VALID_CATEGORIES = [
  'price_objection',
  'spouse_objection',
  'think_about_it',
  'send_info',
  'trust_objection',
  'timing_objection',
  'competitor_objection',
  'buying_signal_next_steps',
  'buying_signal_desire',
  'coaching_talk_ratio',
  'coaching_trial_close',
] as const;

const cardBodySchema = z.object({
  framework: z.enum(VALID_FRAMEWORKS),
  category: z.enum(VALID_CATEGORIES),
  title: z.string().min(1).max(200),
  suggested_response: z.string().min(1).max(2000),
  framework_reference: z.string().max(200).nullable().optional(),
  trigger_keywords: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
});

const patchCardBodySchema = cardBodySchema
  .omit({ framework: true })
  .partial()
  .extend({ is_active: z.boolean().optional() });

const importCardSchema = cardBodySchema.extend({
  is_active: z.boolean().default(true),
});

export async function frameworksRoutes(app: FastifyInstance) {
  // GET /frameworks/cards?framework=nepq&category=optional
  app.get('/cards', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { framework, category } = request.query as { framework?: string; category?: string };

    let query = supabase
      .from('framework_cards')
      .select('*')
      .or(`org_id.is.null,org_id.eq.${req.currentUser.org_id}`)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (framework) query = query.eq('framework', framework);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error, userId: req.currentUser.id }, 'Failed to list framework cards');
      return reply.status(500).send({ message: 'Failed to list framework cards' });
    }

    const cards = (data ?? []).map((card) => ({
      ...card,
      source: card.org_id === null ? 'system' : 'custom',
    }));

    return reply.send(cards);
  });

  // POST /frameworks/cards — Owner/Admin only
  app.post(
    '/cards',
    { preHandler: [authMiddleware, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const body = cardBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });
      }

      const { data, error } = await supabase
        .from('framework_cards')
        .insert({
          ...body.data,
          org_id: req.currentUser.org_id,
          is_active: true,
        })
        .select()
        .single();

      if (error || !data) {
        logger.error({ err: error, userId: req.currentUser.id }, 'Failed to create framework card');
        return reply.status(500).send({ message: 'Failed to create framework card' });
      }

      logger.info({ userId: req.currentUser.id, cardId: data.id }, 'Framework card created');
      return reply.status(201).send({ ...data, source: 'custom' });
    },
  );

  // PATCH /frameworks/cards/:id — Owner/Admin only, custom cards only
  // Note: must be registered AFTER /cards/import and /cards/export to avoid route conflicts
  app.patch(
    '/cards/:id',
    { preHandler: [authMiddleware, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const { id } = request.params as { id: string };
      const body = patchCardBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });
      }

      const { data: existing } = await supabase
        .from('framework_cards')
        .select('id, org_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing) throw new NotFoundError('Card not found');
      if (existing.org_id === null) throw new ForbiddenError('Cannot edit system default cards');
      if (existing.org_id !== req.currentUser.org_id) throw new ForbiddenError();

      const { data, error } = await supabase
        .from('framework_cards')
        .update(body.data)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        logger.error({ err: error, userId: req.currentUser.id, cardId: id }, 'Failed to update framework card');
        return reply.status(500).send({ message: 'Failed to update framework card' });
      }

      logger.info({ userId: req.currentUser.id, cardId: id }, 'Framework card updated');
      return reply.send({ ...data, source: 'custom' });
    },
  );

  // DELETE /frameworks/cards/:id — Owner/Admin only, custom cards only
  app.delete(
    '/cards/:id',
    { preHandler: [authMiddleware, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const { id } = request.params as { id: string };

      const { data: existing } = await supabase
        .from('framework_cards')
        .select('id, org_id')
        .eq('id', id)
        .maybeSingle();

      if (!existing) throw new NotFoundError('Card not found');
      if (existing.org_id === null) throw new ForbiddenError('Cannot delete system default cards');
      if (existing.org_id !== req.currentUser.org_id) throw new ForbiddenError();

      const { error } = await supabase.from('framework_cards').delete().eq('id', id);
      if (error) {
        logger.error({ err: error, userId: req.currentUser.id, cardId: id }, 'Failed to delete framework card');
        return reply.status(500).send({ message: 'Failed to delete framework card' });
      }

      logger.info({ userId: req.currentUser.id, cardId: id }, 'Framework card deleted');
      return reply.status(204).send();
    },
  );

  // POST /frameworks/cards/import — Owner/Admin only
  app.post(
    '/cards/import',
    { preHandler: [authMiddleware, requireRole('owner', 'admin')] },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const bodySchema = z.object({
        cards: z.array(importCardSchema),
        framework: z.enum(VALID_FRAMEWORKS),
      });

      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });
      }

      const errors: string[] = [];
      let imported = 0;

      for (let i = 0; i < body.data.cards.length; i++) {
        const card = body.data.cards[i];
        const { error } = await supabase.from('framework_cards').insert({
          ...card,
          framework: body.data.framework,
          org_id: req.currentUser.org_id,
        });

        if (error) {
          errors.push(`Card ${i + 1} (${card.title}): ${error.message}`);
        } else {
          imported++;
        }
      }

      logger.info({ userId: req.currentUser.id, imported, errors: errors.length }, 'Framework cards imported');
      return reply.send({ imported, errors });
    },
  );

  // GET /frameworks/cards/export?framework=nepq — custom cards only
  app.get('/cards/export', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { framework } = request.query as { framework?: string };

    let query = supabase
      .from('framework_cards')
      .select('*')
      .eq('org_id', req.currentUser.org_id)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (framework) query = query.eq('framework', framework);

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error, userId: req.currentUser.id }, 'Failed to export framework cards');
      return reply.status(500).send({ message: 'Failed to export framework cards' });
    }

    return reply.send(data ?? []);
  });
}
