import cron from 'node-cron';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export function startInviteExpiryChecker(): void {
  // Run daily at 9am UTC
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running invite expiry checker');

    try {
      const now = new Date().toISOString();

      // Find pending invitations that have expired
      const { data: expired, error } = await supabase
        .from('invitations')
        .select('id, org_id, email')
        .eq('status', 'pending')
        .lt('expires_at', now);

      if (error) {
        logger.error({ err: error }, 'Failed to query expired invitations');
        return;
      }

      if (!expired || expired.length === 0) {
        logger.info('No expired invitations found');
        return;
      }

      // Mark them all as expired
      const expiredIds = expired.map((inv) => inv.id);
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .in('id', expiredIds);

      if (updateError) {
        logger.error({ err: updateError }, 'Failed to mark invitations as expired');
        return;
      }

      logger.info({ count: expired.length }, `Marked ${expired.length} invitation(s) as expired`);

      // Create in-app notifications for org owners
      const notificationRows = [];
      for (const inv of expired) {
        // Find the org owner
        const { data: owner } = await supabase
          .from('users')
          .select('id')
          .eq('org_id', inv.org_id)
          .eq('role', 'owner')
          .maybeSingle();

        if (owner) {
          notificationRows.push({
            user_id: owner.id,
            org_id: inv.org_id,
            type: 'invite_expired',
            title: 'Invitation expired',
            body: `Your invitation to ${inv.email} expired. Re-invite if needed.`,
            metadata: { email: inv.email, invitation_id: inv.id },
            channel: 'in_app',
          });
        }
      }

      if (notificationRows.length > 0) {
        const { error: notifError } = await supabase.from('notifications').insert(notificationRows);
        if (notifError) {
          logger.error({ err: notifError }, 'Failed to create invite_expired notifications');
        } else {
          logger.info({ count: notificationRows.length }, 'Created invite_expired notifications');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Unexpected error in invite expiry checker');
    }
  });

  logger.info('Invite expiry checker scheduled (daily at 9am UTC)');
}
