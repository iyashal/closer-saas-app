import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { authMiddleware, type RequestWithUser } from '../lib/auth-middleware.js';
import { requireRole } from '../lib/role-guard.js';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import { sendInvitationEmail } from '../services/email-service.js';
import { env } from '../lib/env.js';

const createInviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'closer']).default('closer'),
});

const acceptInviteBody = z.object({
  full_name: z.string().min(1).max(100),
});

export async function invitationsRoutes(app: FastifyInstance) {
  // Create invitation (owner/admin, team plan only)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const body = createInviteBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body', errors: body.error.flatten() });

    // Fetch org to check plan and seat count
    const { data: org } = await supabase
      .from('organizations')
      .select('plan, max_seats, name')
      .eq('id', req.currentUser.org_id)
      .single();

    // Team plan required — Solo plan owners cannot invite members
    // (plan switching happens in Module 13; for now we check the plan field)
    if (!org || org.plan !== 'team') {
      throw new ForbiddenError('Upgrade to Team plan to invite members');
    }

    // Check seat availability
    const { count: memberCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', req.currentUser.org_id);

    if ((memberCount ?? 0) >= org.max_seats) {
      return reply.status(409).send({ message: `All ${org.max_seats} seats are in use. Add more seats in billing.` });
    }

    // Check email not already in org
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', req.currentUser.org_id)
      .eq('email', body.data.email)
      .maybeSingle();

    if (existingUser) throw new ConflictError('This email is already a member of your organization');

    // Check no pending invite for this email in this org
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('org_id', req.currentUser.org_id)
      .eq('email', body.data.email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) throw new ConflictError('A pending invitation already exists for this email');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        org_id: req.currentUser.org_id,
        email: body.data.email,
        role: body.data.role,
        invited_by: req.currentUser.id,
        token,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !invitation) {
      logger.error({ err: error, orgId: req.currentUser.org_id }, 'Failed to create invitation');
      return reply.status(500).send({ message: 'Failed to create invitation' });
    }

    // Send email — non-blocking, don't fail the request if email fails
    const inviterName = req.currentUser.full_name ?? req.currentUser.email ?? 'Your team';
    sendInvitationEmail({
      to: body.data.email,
      orgName: org.name,
      inviterName,
      token,
      appUrl: env.APP_URL,
    }).catch((err: unknown) => {
      logger.error({ err, invitationId: invitation.id }, 'Failed to send invitation email');
    });

    logger.info({ actorId: req.currentUser.id, orgId: req.currentUser.org_id, email: body.data.email }, 'Invitation created');
    return reply.status(201).send(invitation);
  });

  // List pending invitations for org (owner/admin only)
  app.get('/', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('org_id', req.currentUser.org_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ err: error, orgId: req.currentUser.org_id }, 'Failed to list invitations');
      return reply.status(500).send({ message: 'Failed to list invitations' });
    }
    return reply.send(data ?? []);
  });

  // Get invitation by token — PUBLIC (no auth)
  app.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('id, org_id, email, role, status, expires_at, created_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !invitation) return reply.status(404).send({ message: 'Invitation not found' });
    if (invitation.status !== 'pending') return reply.status(410).send({ message: 'This invitation has already been used or expired' });
    if (new Date(invitation.expires_at) < new Date()) {
      return reply.status(410).send({ message: 'This invitation has expired' });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', invitation.org_id)
      .single();

    return reply.send({ ...invitation, org_name: org?.name ?? '' });
  });

  // Accept invitation — called after new user signs up
  app.post('/:token/accept', { preHandler: authMiddleware }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { token } = request.params as { token: string };
    const body = acceptInviteBody.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ message: 'Invalid body' });

    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!invitation) throw new NotFoundError('Invitation not found');
    if (invitation.status !== 'pending') throw new ConflictError('Invitation already used or expired');
    if (new Date(invitation.expires_at) < new Date()) throw new ConflictError('Invitation has expired');

    // Email must match (check against Supabase auth email)
    const { data: authData } = await supabase.auth.admin.getUserById(req.currentUser.id);
    const authEmail = authData?.user?.email;
    if (authEmail && authEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    // Check if user row already exists (shouldn't, but be safe)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('id', req.currentUser.id)
      .maybeSingle();

    if (existingUser?.org_id) throw new ConflictError('You are already a member of an organization');

    let user;
    if (existingUser) {
      // Update existing row
      const { data } = await supabase
        .from('users')
        .update({
          org_id: invitation.org_id,
          role: invitation.role,
          full_name: body.data.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.currentUser.id)
        .select()
        .single();
      user = data;
    } else {
      // Create user row
      const { data } = await supabase
        .from('users')
        .insert({
          id: req.currentUser.id,
          email: authEmail ?? invitation.email,
          full_name: body.data.full_name,
          org_id: invitation.org_id,
          role: invitation.role,
        })
        .select()
        .single();
      user = data;
    }

    // Mark invitation accepted
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    logger.info({ userId: req.currentUser.id, orgId: invitation.org_id, invitationId: invitation.id }, 'Invitation accepted');
    return reply.status(201).send(user);
  });

  // Revoke pending invitation (owner/admin only)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner', 'admin')] }, async (request, reply) => {
    const req = request as RequestWithUser;
    const { id } = request.params as { id: string };

    const { data: invitation } = await supabase
      .from('invitations')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', req.currentUser.org_id)
      .maybeSingle();

    if (!invitation) throw new NotFoundError('Invitation not found');

    await supabase.from('invitations').delete().eq('id', id);

    logger.info({ actorId: req.currentUser.id, invitationId: id }, 'Invitation revoked');
    return reply.status(204).send();
  });
}
