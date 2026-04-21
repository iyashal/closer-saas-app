import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { logger } from '../lib/logger.js';
import {
  getCloseRateTrend,
  getObjectionFrequency,
  getCueCardEffectiveness,
  getTalkRatioTrend,
  getDealHealthTrend,
  getRevenueTrend,
} from '../services/analytics-service.js';

const chartQuerySchema = z.object({
  range: z.enum(['7', '30', '90', 'all']).default('30'),
  scope: z.enum(['own', 'team']).default('own'),
});

function resolveScope(role: string, rawScope: 'own' | 'team'): 'own' | 'team' {
  return rawScope === 'team' && (role === 'owner' || role === 'admin') ? 'team' : 'own';
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/close-rate-trend', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/close-rate-trend');
    const data = await getCloseRateTrend(user.id, user.org_id, range, scope);
    return reply.send(data);
  });

  app.get('/objection-frequency', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/objection-frequency');
    const data = await getObjectionFrequency(user.id, user.org_id, range, scope);
    return reply.send(data);
  });

  app.get('/cue-card-effectiveness', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/cue-card-effectiveness');
    const data = await getCueCardEffectiveness(user.id, user.org_id, range, scope);
    return reply.send(data);
  });

  app.get('/talk-ratio-trend', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/talk-ratio-trend');
    const data = await getTalkRatioTrend(user.id, user.org_id, range, scope);
    return reply.send(data);
  });

  app.get('/deal-health-trend', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/deal-health-trend');
    const data = await getDealHealthTrend(user.id, user.org_id, range, scope);
    return reply.send(data);
  });

  app.get('/revenue-trend', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const user = req.currentUser;
    const { range, scope: rawScope } = chartQuerySchema.parse(request.query);
    const scope = resolveScope(user.role, rawScope);
    logger.info({ userId: user.id, orgId: user.org_id, range, scope }, 'GET /analytics/revenue-trend');
    const data = await getRevenueTrend(user.id, user.org_id, range, scope);
    return reply.send(data);
  });
}
