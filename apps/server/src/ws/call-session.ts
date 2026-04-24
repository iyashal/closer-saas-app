// Architecture note: We originally planned direct audio streaming (Recall → our WS server →
// Deepgram). The us-west-2 Recall.ai account does not support real_time_media, so we use
// Recall's hosted transcription instead. Recall manages the Deepgram connection; transcript
// events arrive as webhook calls (transcript.data / transcript.partial_data) and are routed
// here via handleTranscriptLine(). This class is now a pure state container + broadcaster.

import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingTranscriptLine {
  call_id: string;
  speaker: 'closer' | 'prospect';
  content: string;
  timestamp_ms: number;
}

export interface CueCardBroadcastPayload {
  card_id: string;
  category: string;
  title: string;
  suggested_response: string;
  framework_reference: string | null;
  trigger_text: string;
  confidence: number;
  coaching_nudge: string;
  coaching_detail: string;
}

interface TalkRatioPayload {
  closer_ratio: number;
  prospect_ratio: number;
  total_seconds: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 4_000;
const TALK_RATIO_INTERVAL_MS = 10_000;

// ─── CallSession ──────────────────────────────────────────────────────────────

export class CallSession {
  readonly callId: string;
  readonly userId: string;
  readonly orgId: string;

  private isActive = true;
  private readonly sessionStartMs: number;

  private readonly wordCounts = new Map<'closer' | 'prospect', number>([
    ['closer', 0],
    ['prospect', 0],
  ]);

  // Rolling transcript buffer — used by Module 6 (objection detection) for context window
  private readonly transcriptBuffer: string[] = [];
  private static readonly BUFFER_MAX = 60; // keep last 60 utterances

  private pendingTranscripts: PendingTranscriptLine[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private talkRatioTimer: NodeJS.Timeout | null = null;

  private readonly transcriptChannel: ReturnType<typeof supabase.channel>;
  private readonly talkRatioChannel: ReturnType<typeof supabase.channel>;
  private readonly statusChannel: ReturnType<typeof supabase.channel>;
  private readonly cueCardsChannel: ReturnType<typeof supabase.channel>;

  private countedTimer: NodeJS.Timeout | null = null;
  private static readonly DAILY_LIMIT_THRESHOLD_MS = 5 * 60 * 1000;

  constructor(callId: string, userId: string, orgId: string) {
    this.callId = callId;
    this.userId = userId;
    this.orgId = orgId;
    this.sessionStartMs = Date.now();

    this.transcriptChannel = supabase.channel(`call:${callId}:transcript`);
    this.talkRatioChannel = supabase.channel(`call:${callId}:talk_ratio`);
    this.statusChannel = supabase.channel(`call:${callId}:status`);
    this.cueCardsChannel = supabase.channel(`call:${callId}:cues`);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    logger.info(
      { callId: this.callId, userId: this.userId, orgId: this.orgId },
      'Call session started — waiting for transcript events',
    );

    await this.subscribeChannels();
    this.startFlushTimer();
    this.startTalkRatioTimer();
    this.scheduleCountedTimer();
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;

    logger.info(
      { callId: this.callId, userId: this.userId, orgId: this.orgId },
      'Stopping call session',
    );

    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.talkRatioTimer) clearInterval(this.talkRatioTimer);
    if (this.countedTimer) clearTimeout(this.countedTimer);

    await this.flushPendingTranscripts().catch((err) =>
      logger.error({ err, callId: this.callId }, 'Error flushing transcripts on stop'),
    );
    await this.pushTalkRatio().catch((err) =>
      logger.error({ err, callId: this.callId }, 'Error pushing final talk ratio on stop'),
    );

    await Promise.allSettled([
      this.transcriptChannel.unsubscribe(),
      this.talkRatioChannel.unsubscribe(),
      this.statusChannel.unsubscribe(),
      this.cueCardsChannel.unsubscribe(),
    ]);

    logger.info({ callId: this.callId }, 'Call session stopped');
  }

  // ── Public API (called by webhook handler) ─────────────────────────────────

  /**
   * Called for each transcript.data (isFinal=true) and transcript.partial_data (isFinal=false)
   * webhook event received from Recall.ai.
   */
  handleTranscriptLine(
    speaker: 'closer' | 'prospect',
    text: string,
    wordCount: number,
    timestampMs: number,
    isFinal: boolean,
  ): void {
    if (!this.isActive) return;

    // Count words for talk ratio — only on final to avoid double-counting partial results
    if (isFinal) {
      this.wordCounts.set(speaker, (this.wordCounts.get(speaker) ?? 0) + wordCount);

      // Append to rolling buffer for Module 6 objection detection
      this.transcriptBuffer.push(`${speaker}: ${text}`);
      if (this.transcriptBuffer.length > CallSession.BUFFER_MAX) {
        this.transcriptBuffer.shift();
      }

      // Stage for batch DB insert
      this.pendingTranscripts.push({
        call_id: this.callId,
        speaker,
        content: text,
        timestamp_ms: timestampMs,
      });
    }

    // Push to frontend via Supabase Realtime immediately
    this.transcriptChannel
      .send({
        type: 'broadcast',
        event: 'transcript',
        payload: {
          type: isFinal ? 'final' : 'interim',
          speaker,
          content: text,
          timestamp_ms: timestampMs,
        },
      })
      .catch((err) =>
        logger.error({ err, callId: this.callId }, 'Failed to broadcast transcript'),
      );
  }

  /** Rolling transcript buffer for Module 6 — last N utterances as plain strings. */
  getTranscriptBuffer(): readonly string[] {
    return this.transcriptBuffer;
  }

  /** Push a cue card to the frontend. coaching_detail renders beneath the suggested response. */
  broadcastCueCard(payload: CueCardBroadcastPayload): void {
    if (!this.isActive) return;
    this.cueCardsChannel
      .send({ type: 'broadcast', event: 'cue_card', payload })
      .catch((err) =>
        logger.error({ err, callId: this.callId }, 'Failed to broadcast cue card'),
      );
  }

  // ── Starter daily call counting ────────────────────────────────────────────

  private scheduleCountedTimer(): void {
    // Check if the call was already live for >= 5 min before this session started
    // (handles server restart mid-call)
    void supabase
      .from('calls')
      .select('started_at, counted_for_daily_limit')
      .eq('id', this.callId)
      .single()
      .then(
        ({ data }) => {
          if (!data || data.counted_for_daily_limit) return;
          const startedAt = data.started_at ? new Date(data.started_at).getTime() : this.sessionStartMs;
          const elapsed = Date.now() - startedAt;
          const remaining = CallSession.DAILY_LIMIT_THRESHOLD_MS - elapsed;
          if (remaining <= 0) {
            this.markCounted();
          } else {
            this.countedTimer = setTimeout(() => this.markCounted(), remaining);
          }
        },
        (err: unknown) => logger.error({ err, callId: this.callId }, 'Failed to schedule counted timer'),
      );
  }

  private markCounted(): void {
    void supabase
      .from('calls')
      .update({ counted_for_daily_limit: true })
      .eq('id', this.callId)
      .eq('counted_for_daily_limit', false)
      .in('status', ['live', 'processing', 'completed'])
      .then(({ error }) => {
        if (error) {
          logger.error({ err: error, callId: this.callId }, 'Failed to mark call as counted');
        } else {
          logger.info({ callId: this.callId, userId: this.userId, orgId: this.orgId }, 'Call marked counted for daily limit');
        }
      });
  }

  // ── Supabase channel subscriptions ────────────────────────────────────────

  private subscribeChannels(): Promise<void> {
    return new Promise((resolve) => {
      let ready = 0;
      const onReady = () => {
        ready++;
        if (ready === 4) resolve();
      };
      this.transcriptChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      this.talkRatioChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      this.statusChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      this.cueCardsChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      // Don't block startup indefinitely if Supabase is slow
      setTimeout(resolve, 5_000);
    });
  }

  // ── Batch DB writes ────────────────────────────────────────────────────────

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushPendingTranscripts().catch((err) =>
        logger.error({ err, callId: this.callId }, 'Error in transcript flush timer'),
      );
    }, FLUSH_INTERVAL_MS);
  }

  private async flushPendingTranscripts(): Promise<void> {
    if (this.pendingTranscripts.length === 0) return;

    const batch = this.pendingTranscripts.splice(0);
    const { error } = await supabase.from('transcript_lines').insert(batch);

    if (error) {
      logger.error(
        { err: error, callId: this.callId, batchSize: batch.length },
        'Failed to insert transcript batch — re-queuing',
      );
      this.pendingTranscripts.unshift(...batch);
    } else {
      logger.debug({ callId: this.callId, batchSize: batch.length }, 'Transcript batch inserted');
    }
  }

  // ── Talk ratio ─────────────────────────────────────────────────────────────

  private startTalkRatioTimer(): void {
    this.talkRatioTimer = setInterval(() => {
      this.pushTalkRatio().catch((err) =>
        logger.error({ err, callId: this.callId }, 'Error in talk ratio timer'),
      );
    }, TALK_RATIO_INTERVAL_MS);
  }

  private async pushTalkRatio(): Promise<void> {
    const closer = this.wordCounts.get('closer') ?? 0;
    const prospect = this.wordCounts.get('prospect') ?? 0;
    const total = closer + prospect;
    if (total === 0) return;

    const totalSeconds = Math.floor((Date.now() - this.sessionStartMs) / 1_000);
    const payload: TalkRatioPayload = {
      closer_ratio: Math.round((closer / total) * 100) / 100,
      prospect_ratio: Math.round((prospect / total) * 100) / 100,
      total_seconds: totalSeconds,
    };

    try {
      await this.talkRatioChannel.send({ type: 'broadcast', event: 'talk_ratio', payload });
    } catch (err) {
      logger.error({ err, callId: this.callId }, 'Failed to broadcast talk ratio');
    }

    const { error } = await supabase
      .from('calls')
      .update({
        talk_ratio_closer: payload.closer_ratio,
        talk_ratio_prospect: payload.prospect_ratio,
        duration_seconds: totalSeconds,
      })
      .eq('id', this.callId);

    if (error) {
      logger.error({ err: error, callId: this.callId }, 'Failed to update talk ratios in DB');
    }
  }
}
