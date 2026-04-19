import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first, fallback to .env
config({ path: resolve(process.cwd(), '../../.env.local') });
config({ path: resolve(process.cwd(), '../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger } from './lib/logger.js';
import { env } from './lib/env.js';
import { AppError } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { orgRoutes } from './routes/org.js';
import { offersRoutes } from './routes/offers.js';

const app = Fastify({ logger });

await app.register(cors, {
  origin: env.APP_URL,
  credentials: true,
});
await app.register(helmet);

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

const port = Number(env.PORT);
await app.listen({ port, host: '0.0.0.0' });
