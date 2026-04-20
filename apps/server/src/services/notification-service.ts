import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export interface CreateNotificationOptions {
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
    return;
  }

  // For channel='both' or 'email', dispatch email if the notification type warrants it
  if (options.channel === 'both' || options.channel === 'email') {
    await dispatchEmail(options).catch((err) =>
      logger.error({ err, userId: options.user_id, type: options.type }, 'Failed to dispatch email for notification'),
    );
  }
}

async function dispatchEmail(options: CreateNotificationOptions): Promise<void> {
  // Look up user preferences and email
  const { data: user } = await supabase
    .from('users')
    .select('email, full_name, notification_preferences')
    .eq('id', options.user_id)
    .single();

  if (!user) return;

  const prefs = (user.notification_preferences ?? {}) as Record<string, boolean>;
  const appUrl = process.env['APP_URL'] ?? 'https://closeforce.io';

  // Dynamically import to avoid circular deps at module load time
  const emailService = await import('./email-service.js');

  switch (options.type) {
    case 'call_summary_ready': {
      if (prefs['email_call_summary'] === false) return;
      const callId = options.metadata?.['call_id'] as string | undefined;
      const score = options.metadata?.['deal_health_score'] as number | null | undefined;
      if (!callId) return;

      await emailService.sendCallSummaryEmail({
        to: user.email,
        fullName: user.full_name,
        prospectName: (options.metadata?.['prospect_name'] as string | undefined) ?? 'your prospect',
        dealHealthScore: score ?? null,
        callId,
        appUrl,
      });
      break;
    }

    case 'trial_expiring_7d':
    case 'trial_expiring_2d':
    case 'trial_expired': {
      if (prefs['email_trial_expiring'] === false) return;
      const daysLeft =
        options.type === 'trial_expiring_7d' ? 7 : options.type === 'trial_expiring_2d' ? 2 : 0;

      if (daysLeft > 0) {
        await emailService.sendTrialExpiringEmail({
          to: user.email,
          fullName: user.full_name,
          daysLeft,
          appUrl,
        });
      }
      break;
    }

    case 'payment_failed': {
      if (prefs['email_payment_failed'] === false) return;
      // Payment failure email handled directly in stripe webhook handler
      break;
    }

    default:
      break;
  }
}
