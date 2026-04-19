import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@closer/shared';
import { ForbiddenError } from './errors.js';

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const user = (request as FastifyRequest & { currentUser: { role: UserRole } }).currentUser;
    if (!roles.includes(user.role)) throw new ForbiddenError();
  };
}
