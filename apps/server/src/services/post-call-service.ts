import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { generatePostCallSummary, generateFollowUpEmail } from './claude-service.js';
import { createNotification } from './notification-service.js';
import type { Offer } from '@closer/shared';

// ─── Talk ratio helpers ────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calcTalkRatios(
  lines: Array<{ speaker: string; content: string }>,
): { closer: number; prospect: number } {
  let closerWords = 0;
  let prospectWords = 0;

  for (const line of lines) {
    const wc = countWords(line.content);
    if (line.speaker === 'closer') {
      closerWords += wc;
    } else {
      prospectWords += wc;
    }
  }

  const total = closerWords + prospectWords;
  if (total === 0) return { closer: 0.5, prospect: 0.5 };

  return {
    closer: Math.round((closerWords / total) * 100) / 100,
    prospect: Math.round((prospectWords / total) * 100) / 100,
  };
}

// ─── Milestone checks ─────────────────────────────────────────────────────────

const CLOSE_RATE_MILESTONES = [50, 60, 70, 80];

async function checkMilestones(
  userId: string,
  orgId: string,
  currentOutcome: string | null,
): Promise<void> {
  const { data: allCalls } = await supabase
    .from('calls')
    .select('outcome')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('outcome', 'is', null);

  if (!allCalls || allCalls.length < 5) return;

  const total = allCalls.length;
  const closed = allCalls.filter((c) => c.outcome === 'closed').length;
  const closeRate = Math.round((closed / total) * 100);

  // Check if close rate just crossed a milestone
  for (const milestone of CLOSE_RATE_MILESTONES) {
    const prevTotal = total - 1;
    const prevClosed = currentOutcome === 'closed' ? closed - 1 : closed;
    const prevRate = prevTotal > 0 ? Math.round((prevClosed / prevTotal) * 100) : 0;

    if (prevRate < milestone && closeRate >= milestone) {
      await createNotification({
        user_id: userId,
        org_id: orgId,
        type: 'close_rate_milestone',
        title: `Close rate just hit ${milestone}%`,
        body: `You're on fire — your close rate just hit ${milestone}%!`,
        channel: 'in_app',
        metadata: { close_rate: closeRate, milestone },
      }).catch((err) =>
        logger.error({ err, userId, milestone }, 'Failed to create milestone notification'),
      );
      break;
    }
  }

  // Check for 3+ consecutive closes
  const recent = allCalls.slice(-10).reverse();
  let streak = 0;
  for (const call of recent) {
    if (call.outcome === 'closed') {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 3 && currentOutcome === 'closed') {
    await createNotification({
      user_id: userId,
      org_id: orgId,
      type: 'streak_alert',
      title: `${streak}-call closing streak!`,
      body: `${streak}-call closing streak! Keep it going.`,
      channel: 'in_app',
      metadata: { streak },
    }).catch((err) =>
      logger.error({ err, userId, streak }, 'Failed to create streak notification'),
    );
  }
}

// ─── Core processCall ─────────────────────────────────────────────────────────

export async function processCall(callId: string): Promise<void> {
  const callContext = { callId, userId: '', orgId: '' };

  try {
    // Idempotency guard — skip if already completed
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id, status, user_id, org_id, offer_id, prospect_name, outcome, framework_used, ended_at')
      .eq('id', callId)
      .maybeSingle();

    if (!existingCall) {
      logger.warn({ callId }, 'processCall: call not found');
      return;
    }

    if (existingCall.status === 'completed') {
      logger.info({ callId }, 'processCall: already completed — skipping');
      return;
    }

    callContext.userId = existingCall.user_id;
    callContext.orgId = existingCall.org_id;

    logger.info(callContext, 'Post-call processing started');

    // Fetch transcript lines ordered by timestamp
    const { data: transcriptLines, error: transcriptError } = await supabase
      .from('transcript_lines')
      .select('speaker, content, timestamp_ms')
      .eq('call_id', callId)
      .order('timestamp_ms', { ascending: true });

    if (transcriptError) {
      logger.error({ err: transcriptError, ...callContext }, 'Failed to fetch transcript lines');
    }

    const lines = transcriptLines ?? [];

    // Fetch offer details via call record
    const { data: callWithOffer } = await supabase
      .from('calls')
      .select('*, offers(id, name, price, guarantee, description, common_objections, org_id, created_by, is_active, created_at)')
      .eq('id', callId)
      .single();

    const offer = callWithOffer?.offers as Offer | null;
    const framework = existingCall.framework_used ?? 'nepq';
    const prospectName = existingCall.prospect_name ?? 'the prospect';

    // Format transcript as readable text
    const formattedTranscript = lines
      .map((l) => `${l.speaker === 'closer' ? 'Closer' : 'Prospect'}: ${l.content}`)
      .join('\n');

    // Calculate talk ratios from DB transcript
    const talkRatios = calcTalkRatios(lines);

    // Count cue cards
    const { count: shownCount } = await supabase
      .from('cue_cards_shown')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', callId);

    const { count: usedCount } = await supabase
      .from('cue_cards_shown')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', callId)
      .eq('was_used', true);

    // Calculate duration
    const startedAt = callWithOffer?.started_at;
    const endedAt = callWithOffer?.ended_at ?? new Date().toISOString();
    let durationSeconds: number | null = null;
    if (startedAt) {
      durationSeconds = Math.floor(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      );
    }

    // Call Claude Sonnet for post-call summary
    let summaryResult = null;
    if (offer && formattedTranscript.length > 0) {
      summaryResult = await generatePostCallSummary(
        formattedTranscript,
        offer,
        framework,
        callContext,
      );
    }

    // Generate separate follow-up email if outcome is set, otherwise use summary's email
    let followUpEmail = summaryResult?.follow_up_email ?? null;
    if (offer && formattedTranscript.length > 0 && existingCall.outcome) {
      const generatedEmail = await generateFollowUpEmail(
        formattedTranscript,
        prospectName,
        offer,
        existingCall.outcome,
        callContext,
      );
      if (generatedEmail) followUpEmail = generatedEmail;
    }

    // Build update payload
    const updates: Record<string, unknown> = {
      status: 'completed',
      talk_ratio_closer: talkRatios.closer,
      talk_ratio_prospect: talkRatios.prospect,
      cue_cards_shown_count: shownCount ?? 0,
      cue_cards_used_count: usedCount ?? 0,
      ended_at: endedAt,
    };

    if (durationSeconds !== null) updates.duration_seconds = durationSeconds;

    if (summaryResult) {
      updates.summary = summaryResult.summary;
      updates.deal_health_score = summaryResult.deal_health_score;
      updates.next_steps = summaryResult.next_steps;
      updates.what_you_should_have_said = summaryResult.objection_log.map((entry) => ({
        timestamp: entry.timestamp_ms,
        objection: entry.what_prospect_said,
        your_response: entry.how_closer_handled,
        better_response: entry.better_alternative,
      }));
    } else {
      // Partial failure — mark completed with a note so the UI can still show the transcript
      updates.summary =
        'AI summary unavailable — your transcript and call data are still available below.';
    }

    if (followUpEmail) updates.follow_up_email = followUpEmail;

    const { error: updateError } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', callId);

    if (updateError) {
      logger.error({ err: updateError, ...callContext }, 'Failed to update call after processing');
      throw updateError;
    }

    logger.info(callContext, 'Post-call processing completed — call marked as completed');

    // Notifications
    await notifyCallComplete(callId, existingCall, prospectName, summaryResult?.deal_health_score ?? null);
    await checkMilestones(existingCall.user_id, existingCall.org_id, existingCall.outcome);
  } catch (err) {
    logger.error({ err, ...callContext }, 'processCall failed — marking call as failed');

    await supabase
      .from('calls')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Post-call processing error',
      })
      .eq('id', callId)
      .neq('status', 'completed'); // don't overwrite a successful completion
  }
}

// ─── Notifications ─────────────────────────────────────────────────────────────

async function notifyCallComplete(
  callId: string,
  call: { user_id: string; org_id: string; prospect_name: string | null },
  prospectName: string,
  dealHealthScore: number | null,
): Promise<void> {
  const score = dealHealthScore !== null ? `${dealHealthScore}/100` : 'N/A';

  // Notify the closer
  await createNotification({
    user_id: call.user_id,
    org_id: call.org_id,
    type: 'call_summary_ready',
    title: 'Call summary ready',
    body: `Your call with ${prospectName} is ready to review. Deal health: ${score}`,
    channel: 'both',
    metadata: { call_id: callId, deal_health_score: dealHealthScore },
  }).catch((err) =>
    logger.error({ err, callId }, 'Failed to create call_summary_ready notification'),
  );

  // Notify owners/admins in the org
  const { data: orgMembers } = await supabase
    .from('users')
    .select('id, org_id')
    .eq('org_id', call.org_id)
    .in('role', ['owner', 'admin'])
    .neq('id', call.user_id);

  if (orgMembers && orgMembers.length > 0) {
    // Check if team plan
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', call.org_id)
      .single();

    if (org?.plan === 'team') {
      await Promise.allSettled(
        orgMembers.map((member) =>
          createNotification({
            user_id: member.id,
            org_id: call.org_id,
            type: 'new_call_completed',
            title: 'Call completed',
            body: `A closer finished a call with ${prospectName}.`,
            channel: 'in_app',
            metadata: { call_id: callId, closer_user_id: call.user_id },
          }),
        ),
      );
    }
  }
}
