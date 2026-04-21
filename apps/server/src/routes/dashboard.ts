import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { requirePlan } from '../lib/plan-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import {
  getCloserStats,
  getTeamStats,
  getLeaderboard,
  getRecentCalls,
} from '../services/analytics-service.js';

const timeRangeSchema = z.enum(['week', 'month', 'all']).default('week');

const myStatsQuery = z.object({ range: timeRangeSchema });
const teamStatsQuery = z.object({ range: timeRangeSchema });
const leaderboardQuery = z.object({ range: timeRangeSchema });
const recentCallsQuery = z.object({
  scope: z.enum(['own', 'team']).default('own'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/my-stats',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;
      const { range } = myStatsQuery.parse(request.query);

      logger.info({ userId: user.id, orgId: user.org_id, range }, 'GET /dashboard/my-stats');

      const stats = await getCloserStats(user.id, user.org_id, range);
      return reply.send(stats);
    },
  );

  app.get(
    '/team-stats',
    {
      preHandler: [
        authMiddleware,
        requireRole('owner', 'admin'),
        requirePlan('team'),
      ],
    },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;
      const { range } = teamStatsQuery.parse(request.query);

      logger.info({ userId: user.id, orgId: user.org_id, range }, 'GET /dashboard/team-stats');

      const stats = await getTeamStats(user.org_id, range);
      return reply.send(stats);
    },
  );

  app.get(
    '/leaderboard',
    {
      preHandler: [
        authMiddleware,
        requireRole('owner', 'admin'),
        requirePlan('team'),
      ],
    },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;
      const { range } = leaderboardQuery.parse(request.query);

      logger.info({ userId: user.id, orgId: user.org_id, range }, 'GET /dashboard/leaderboard');

      const entries = await getLeaderboard(user.org_id, range);
      return reply.send(entries);
    },
  );

  app.get(
    '/recent-calls',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;
      const parsed = recentCallsQuery.parse(request.query);

      // Non-admins can only see their own calls
      const scope =
        parsed.scope === 'team' && (user.role === 'owner' || user.role === 'admin')
          ? 'team'
          : 'own';

      logger.info({ userId: user.id, orgId: user.org_id, scope }, 'GET /dashboard/recent-calls');

      const calls = await getRecentCalls(user.id, user.org_id, scope, parsed.limit);
      return reply.send(calls);
    },
  );

  app.get(
    '/live-calls',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const req = request as RequestWithUser;
      const user = req.currentUser;
      const isAdmin = user.role === 'owner' || user.role === 'admin';

      let query = supabase
        .from('calls')
        .select('id, prospect_name, status, offer_id, offers(name), user_id')
        .in('status', ['bot_joining', 'live']);

      if (isAdmin) {
        query = query.eq('org_id', user.org_id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        logger.error({ userId: user.id, err: error }, 'GET /dashboard/live-calls failed');
        return reply.send([]);
      }

      // For admins, attach closer names
      let nameMap = new Map<string, string | null>();
      if (isAdmin && (data ?? []).length > 0) {
        const uniqueIds = [...new Set((data ?? []).map((c) => c.user_id))];
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', uniqueIds);
        nameMap = new Map((users ?? []).map((u) => [u.id, u.full_name as string | null]));
      }

      const result = (data ?? []).map((c) => ({
        id: c.id,
        prospect_name: c.prospect_name,
        status: c.status,
        offer_name: (c.offers as { name?: string } | null)?.name ?? null,
        closer_name: isAdmin ? (nameMap.get(c.user_id) ?? null) : null,
      }));

      return reply.send(result);
    },
  );
}
