import WebSocket from 'ws';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

// ─── Deepgram response types ────────────────────────────────────────────────

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  punctuated_word: string;
}

interface DeepgramResult {
  type: string;
  start: number;
  duration: number;
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words: DeepgramWord[];
    }>;
  };
}

// ─── Internal types ──────────────────────────────────────────────────────────

interface PendingTranscriptLine {
  call_id: string;
  speaker: 'closer' | 'prospect';
  content: string;
  timestamp_ms: number;
}

interface TalkRatioPayload {
  closer_ratio: number;
  prospect_ratio: number;
  total_seconds: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Nova-3 + diarization for speaker labels. endpointing=300ms balances
// low-latency finalization against false-final results.
const DEEPGRAM_WS_URL =
  'wss://api.deepgram.com/v1/listen?' +
  new URLSearchParams({
    model: 'nova-3',
    language: 'en',
    punctuate: 'true',
    diarize: 'true',
    interim_results: 'true',
    endpointing: '300',
    smart_format: 'true',
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
  }).toString();

const FLUSH_INTERVAL_MS = 4_000;
const TALK_RATIO_INTERVAL_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];

// ─── CallSession ─────────────────────────────────────────────────────────────

export class CallSession {
  private readonly callId: string;
  private readonly userId: string;
  private readonly orgId: string;

  // The WebSocket connection FROM Recall.ai — they initiate to our server
  private readonly recallSocket: WebSocket;

  private deepgramWs: WebSocket | null = null;
  private isActive = true;
  private transcriptionPaused = false;
  private reconnectAttempts = 0;

  // Deepgram speaker IDs are numeric; first seen = closer (pre-joined the call)
  private readonly speakerMap = new Map<number, 'closer' | 'prospect'>();
  private firstSpeakerId: number | null = null;

  private readonly wordCounts = new Map<'closer' | 'prospect', number>([
    ['closer', 0],
    ['prospect', 0],
  ]);
  private readonly sessionStartMs: number;

  private pendingTranscripts: PendingTranscriptLine[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private talkRatioTimer: NodeJS.Timeout | null = null;

  private readonly transcriptChannel: ReturnType<typeof supabase.channel>;
  private readonly talkRatioChannel: ReturnType<typeof supabase.channel>;
  private readonly statusChannel: ReturnType<typeof supabase.channel>;

  constructor(callId: string, userId: string, orgId: string, recallSocket: WebSocket) {
    this.callId = callId;
    this.userId = userId;
    this.orgId = orgId;
    this.recallSocket = recallSocket;
    this.sessionStartMs = Date.now();

    this.transcriptChannel = supabase.channel(`call:${callId}:transcript`);
    this.talkRatioChannel = supabase.channel(`call:${callId}:talk_ratio`);
    this.statusChannel = supabase.channel(`call:${callId}:status`);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    logger.info(
      { callId: this.callId, userId: this.userId, orgId: this.orgId },
      'Starting call session',
    );

    await this.subscribeChannels();
    this.wireRecallSocket();
    this.connectDeepgram();
    this.startFlushTimer();
    this.startTalkRatioTimer();
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

    await this.flushPendingTranscripts().catch((err) =>
      logger.error({ err, callId: this.callId }, 'Error flushing transcripts on stop'),
    );
    await this.pushTalkRatio().catch((err) =>
      logger.error({ err, callId: this.callId }, 'Error pushing final talk ratio on stop'),
    );

    await this.closeDeepgramGracefully();

    await Promise.allSettled([
      this.transcriptChannel.unsubscribe(),
      this.talkRatioChannel.unsubscribe(),
      this.statusChannel.unsubscribe(),
    ]);

    logger.info({ callId: this.callId }, 'Call session stopped');
  }

  // ── Channel subscriptions ──────────────────────────────────────────────────

  private subscribeChannels(): Promise<void> {
    return new Promise((resolve) => {
      let ready = 0;
      const onReady = () => {
        ready++;
        if (ready === 3) resolve();
      };

      this.transcriptChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      this.talkRatioChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });
      this.statusChannel.subscribe((s) => { if (s === 'SUBSCRIBED') onReady(); });

      // Don't block startup indefinitely if Supabase is slow
      setTimeout(resolve, 5_000);
    });
  }

  // ── Recall.ai WebSocket ────────────────────────────────────────────────────

  private wireRecallSocket(): void {
    this.recallSocket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      if (!this.isActive) return;
      if (this.deepgramWs?.readyState === WebSocket.OPEN) {
        try {
          this.deepgramWs.send(data);
        } catch (err) {
          logger.error({ err, callId: this.callId }, 'Error forwarding audio to Deepgram');
        }
      }
    });

    this.recallSocket.on('close', () => {
      logger.info({ callId: this.callId }, 'Recall audio stream closed');
      if (this.isActive) {
        this.stop().catch((err) =>
          logger.error({ err, callId: this.callId }, 'Error stopping session on Recall close'),
        );
      }
    });

    this.recallSocket.on('error', (err) => {
      logger.error(
        { err, callId: this.callId, userId: this.userId, orgId: this.orgId },
        'Recall WebSocket error',
      );
    });
  }

  // ── Deepgram connection ────────────────────────────────────────────────────

  private connectDeepgram(): void {
    if (!this.isActive) return;

    try {
      const ws = new WebSocket(DEEPGRAM_WS_URL, {
        headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` },
      });
      this.deepgramWs = ws;

      ws.on('open', () => {
        this.reconnectAttempts = 0;
        logger.info({ callId: this.callId }, 'Deepgram WebSocket connected');

        if (this.transcriptionPaused) {
          this.transcriptionPaused = false;
          this.pushStatusUpdate('transcription_resumed').catch((err) =>
            logger.error({ err, callId: this.callId }, 'Failed to push transcription_resumed'),
          );
        }
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(raw.toString()) as DeepgramResult;
          if (msg.type === 'Results') this.handleDeepgramResult(msg);
        } catch (err) {
          logger.error({ err, callId: this.callId }, 'Error parsing Deepgram message');
        }
      });

      ws.on('close', (code, reason) => {
        logger.warn(
          { callId: this.callId, code, reason: reason.toString() },
          'Deepgram connection closed',
        );
        if (this.isActive) this.handleDeepgramDisconnect();
      });

      ws.on('error', (err) => {
        logger.error(
          { err, callId: this.callId, userId: this.userId, orgId: this.orgId },
          'Deepgram WebSocket error',
        );
      });
    } catch (err) {
      logger.error({ err, callId: this.callId }, 'Failed to open Deepgram WebSocket');
      this.handleDeepgramDisconnect();
    }
  }

  private handleDeepgramDisconnect(): void {
    if (!this.isActive) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(
        { callId: this.callId, attempts: this.reconnectAttempts },
        'Deepgram reconnect limit reached — transcription paused',
      );
      this.transcriptionPaused = true;
      this.pushStatusUpdate('transcription_paused').catch((err) =>
        logger.error({ err, callId: this.callId }, 'Failed to push transcription_paused'),
      );
      return;
    }

    const delay =
      RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempts++;
    logger.info(
      { callId: this.callId, attempt: this.reconnectAttempts, delayMs: delay },
      'Reconnecting to Deepgram',
    );

    setTimeout(() => {
      if (this.isActive) this.connectDeepgram();
    }, delay);
  }

  private async closeDeepgramGracefully(): Promise<void> {
    const ws = this.deepgramWs;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(JSON.stringify({ type: 'CloseStream' }));
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 2_000);
        ws.once('close', () => { clearTimeout(t); resolve(); });
      });
    } catch (err) {
      logger.error({ err, callId: this.callId }, 'Error closing Deepgram gracefully');
    }
  }

  // ── Transcript processing ──────────────────────────────────────────────────

  private handleDeepgramResult(result: DeepgramResult): void {
    const alt = result.channel?.alternatives?.[0];
    const transcript = alt?.transcript?.trim();
    if (!transcript) return;

    const words = alt?.words ?? [];
    const speaker = this.resolveSpeaker(words[0]?.speaker ?? 0);
    const timestampMs = Math.floor(result.start * 1_000);

    // Count words only on final results to avoid double-counting interim
    if (result.is_final) {
      this.wordCounts.set(speaker, (this.wordCounts.get(speaker) ?? 0) + words.length);
    }

    this.pushTranscriptToRealtime({
      type: result.is_final ? 'final' : 'interim',
      speaker,
      content: transcript,
      timestamp_ms: timestampMs,
    }).catch((err) =>
      logger.error({ err, callId: this.callId }, 'Failed to broadcast transcript'),
    );

    if (result.is_final) {
      this.pendingTranscripts.push({
        call_id: this.callId,
        speaker,
        content: transcript,
        timestamp_ms: timestampMs,
      });
    }
  }

  // First speaker Deepgram sees = closer (they were in the call before the bot)
  private resolveSpeaker(deepgramId: number): 'closer' | 'prospect' {
    if (this.speakerMap.has(deepgramId)) return this.speakerMap.get(deepgramId)!;

    const role: 'closer' | 'prospect' = this.firstSpeakerId === null ? 'closer' : 'prospect';
    if (this.firstSpeakerId === null) this.firstSpeakerId = deepgramId;
    this.speakerMap.set(deepgramId, role);
    return role;
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

  // ── Realtime helpers ───────────────────────────────────────────────────────

  private async pushTranscriptToRealtime(payload: {
    type: 'interim' | 'final';
    speaker: 'closer' | 'prospect';
    content: string;
    timestamp_ms: number;
  }): Promise<void> {
    await this.transcriptChannel.send({ type: 'broadcast', event: 'transcript', payload });
  }

  private async pushStatusUpdate(
    status: 'transcription_paused' | 'transcription_resumed',
  ): Promise<void> {
    await this.statusChannel.send({ type: 'broadcast', event: 'status', payload: { status } });
  }
}
