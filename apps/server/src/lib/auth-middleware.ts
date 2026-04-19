import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from './supabase.js';
import { UnauthorizedError } from './errors.js';
import type { User } from '../types/index.js';

export interface RequestWithUser extends FastifyRequest {
  currentUser: User & { email: string };
}

export async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new UnauthorizedError();

  const authUser = data.user;

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  // Attach DB user if it exists, otherwise minimal auth user (needed for complete-signup)
  (request as RequestWithUser).currentUser = dbUser
    ? { ...dbUser, email: dbUser.email ?? authUser.email }
    : ({ id: authUser.id, email: authUser.email ?? '' } as User & { email: string });
}
