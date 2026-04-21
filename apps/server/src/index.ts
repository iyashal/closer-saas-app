import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first, fallback to .env
config({ path: resolve(process.cwd(), '../../.env.local') });
config({ path: resolve(process.cwd(), '../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { logger } from './lib/logger.js';
import { env } from './lib/env.js';
import { AppError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { orgRoutes } from './routes/org.js';
import { offersRoutes } from './routes/offers.js';
import { usersRoutes } from './routes/users.js';
import { invitationsRoutes } from './routes/invitations.js';
import { callsRoutes } from './routes/calls.js';
import { recallWebhookRoutes } from './routes/webhooks/recall.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { analyticsRoutes } from './routes/analytics.js';
import { startInviteExpiryChecker } from './jobs/invite-expiry-checker.js';
import { registerWsRoutes, stopAllSessions } from './ws/handler.js';

const app = Fastify({ logger });

await app.register(cors, {
  origin: env.APP_URL,
  credentials: true,
});
await app.register(helmet);
// Must be registered before any WebSocket route handlers
await app.register(websocket);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }
  logger.error({ err: error }, 'Unhandled server error');
  return reply.status(500).send({ message: 'Internal server error' });
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(authRoutes, { prefix: '/auth' });
await app.register(orgRoutes, { prefix: '/org' });
await app.register(offersRoutes, { prefix: '/offers' });
await app.register(usersRoutes, { prefix: '/users' });
await app.register(invitationsRoutes, { prefix: '/invitations' });
await app.register(callsRoutes, { prefix: '/calls' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });
await app.register(analyticsRoutes, { prefix: '/analytics' });
await app.register(recallWebhookRoutes, { prefix: '/webhooks/recall' });
await app.register(registerWsRoutes);

// Start background jobs
startInviteExpiryChecker();

// Graceful shutdown — flush in-flight transcripts before exit
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received');
  await stopAllSessions();
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const port = Number(env.PORT);
await app.listen({ port, host: '0.0.0.0' });
