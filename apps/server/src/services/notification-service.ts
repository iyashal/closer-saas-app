import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

interface CreateNotificationOptions {
  user_id: string;
  org_id: string;
  type: string;
  title: string;
  body: string;
  channel: 'in_app' | 'email' | 'both';
  metadata?: Record<string, unknown>;
}

export async function createNotification(options: CreateNotificationOptions): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: options.user_id,
    org_id: options.org_id,
    type: options.type,
    title: options.title,
    body: options.body,
    channel: options.channel,
    metadata: options.metadata ?? {},
    is_read: false,
  });

  if (error) {
    logger.error(
      { err: error, userId: options.user_id, type: options.type },
      'Failed to create notification',
    );
  }
}
