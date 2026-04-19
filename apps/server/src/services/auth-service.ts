import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { ConflictError } from '../lib/errors.js';
import type { Organization, User } from '../types/index.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix++;
  }
}

export async function completeSignup(params: {
  userId: string;
  email: string;
  fullName: string;
}): Promise<{ org: Organization; user: User }> {
  const { userId, email, fullName } = params;

  // Check if user row already exists (idempotent)
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existingUser) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', existingUser.org_id)
      .single();
    return { org: org as Organization, user: existingUser as User };
  }

  const orgName = fullName ? `${fullName}'s Team` : 'My Team';
  const slug = await uniqueSlug(orgName);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      owner_id: userId,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
      max_seats: 1,
    })
    .select()
    .single();

  if (orgError || !org) {
    logger.error({ err: orgError, userId }, 'Failed to create organization');
    throw new ConflictError('Failed to create organization');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: fullName || null,
      org_id: org.id,
      role: 'owner',
    })
    .select()
    .single();

  if (userError || !user) {
    logger.error({ err: userError, userId, orgId: org.id }, 'Failed to create user row');
    // Rollback org
    await supabase.from('organizations').delete().eq('id', org.id);
    throw new ConflictError('Failed to create user');
  }

  logger.info({ userId, orgId: org.id }, 'Signup complete: org and user created');
  return { org: org as Organization, user: user as User };
}
