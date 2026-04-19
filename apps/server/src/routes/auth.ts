import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { completeSignup } from '../services/auth-service.js';
import { authMiddleware } from '../lib/auth-middleware.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const completeSignupBody = z.object({
  full_name: z.string().min(1).max(100),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/complete-signup', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as typeof request & { currentUser: { id: string; email: string } };
    const body = completeSignupBody.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: 'Invalid request body', errors: body.error.flatten() });
    }

    try {
      const result = await completeSignup({
        userId: req.currentUser.id,
        email: req.currentUser.email,
        fullName: body.data.full_name,
      });
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send({ message: err.message });
      }
      logger.error({ err, userId: req.currentUser.id }, 'Unexpected error in complete-signup');
      return reply.status(500).send({ message: 'Internal server error' });
    }
  });

  app.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as typeof request & { currentUser: Record<string, unknown> };
    return reply.send(req.currentUser);
  });
}
