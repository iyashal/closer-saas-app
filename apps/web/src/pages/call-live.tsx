import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  Radio,
  Clock,
  Trash2,
  AlertCircle,
  ArrowDown,
  Mic,
  MicOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Call } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranscriptEntry {
  id: string;
  type: 'final' | 'interim';
  speaker: 'closer' | 'prospect';
  content: string;
  timestamp_ms: number;
}

interface TalkRatio {
  closer_ratio: number;
  prospect_ratio: number;
  total_seconds: number;
}

type TranscriptionStatus = 'connecting' | 'live' | 'paused';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
      </span>
    );
  }
  if (status === 'bot_joining') {
    return <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />;
  }
  return null;
}

function TranscriptLine({ entry }: { entry: TranscriptEntry }) {
  const isCloser = entry.speaker === 'closer';
  return (
    <div className={`flex flex-col gap-0.5 ${entry.type === 'interim' ? 'opacity-50' : 'opacity-100'}`}>
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          isCloser ? 'text-blue-400' : 'text-gray-500'
        }`}
      >
        {isCloser ? 'Closer' : 'Prospect'}
      </span>
      <p
        className={`text-sm leading-relaxed ${isCloser ? 'text-gray-100' : 'text-gray-300'} ${
          entry.type === 'interim' ? 'italic' : ''
        }`}
      >
        {entry.content}
      </p>
    </div>
  );
}

function TalkRatioBar({ ratio }: { ratio: TalkRatio | null }) {
  if (!ratio) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span>Talk ratio</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/5" />
      </div>
    );
  }

  const closerPct = Math.round(ratio.closer_ratio * 100);
  const isHighTalk = ratio.closer_ratio > 0.6;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-blue-400 font-medium w-16 shrink-0">
        Closer {closerPct}%
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isHighTalk ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${closerPct}%` }}
        />
      </div>
      <span className="text-gray-500 font-medium w-20 text-right shrink-0">
        {Math.round(ratio.prospect_ratio * 100)}% Prospect
      </span>
      {isHighTalk && (
        <span className="text-amber-400 text-xs font-medium shrink-0">
          You&apos;re talking too much
        </span>
      )}
    </div>
  );
}

function TranscriptionStatusPill({ status }: { status: TranscriptionStatus }) {
  if (status === 'live') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-400">
        <Mic size={12} />
        <span>Live</span>
      </div>
    );
  }
  if (status === 'paused') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <MicOff size={12} />
        <span>Transcription paused</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Loader2 size={12} className="animate-spin" />
      <span>Connecting…</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallLivePage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();

  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimEntry, setInterimEntry] = useState<TranscriptEntry | null>(null);
  const [talkRatio, setTalkRatio] = useState<TalkRatio | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>('connecting');

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const interimIdRef = useRef(`interim-${Date.now()}`);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch call & poll status ────────────────────────────────────────────

  const fetchCall = useCallback(async () => {
    if (!callId) return;
    try {
      const data = await api.get<Call>(`/calls/${callId}`);
      setCall(data);
      if (data.status === 'completed') {
        if (pollRef.current) clearInterval(pollRef.current);
        navigate(`/calls/${callId}/summary`);
      }
      if (data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      if (pollRef.current) clearInterval(pollRef.current);
    } finally {
      setLoading(false);
    }
  }, [callId, navigate]);

  useEffect(() => {
    fetchCall();
    pollRef.current = setInterval(fetchCall, 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchCall]);

  // ── Call timer ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!call?.started_at || call.status !== 'live') return;
    const startMs = new Date(call.started_at).getTime();
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startMs) / 1_000));
    tick();
    timerRef.current = setInterval(tick, 1_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.started_at, call?.status]);

  // ── Supabase Realtime (active when call is live) ─────────────────────────

  useEffect(() => {
    if (!callId || call?.status !== 'live') return;

    setTranscriptionStatus('connecting');

    const transcriptCh = supabase.channel(`call:${callId}:transcript`);
    const talkRatioCh = supabase.channel(`call:${callId}:talk_ratio`);
    const statusCh = supabase.channel(`call:${callId}:status`);

    transcriptCh
      .on('broadcast', { event: 'transcript' }, ({ payload }) => {
        const p = payload as {
          type: 'final' | 'interim';
          speaker: 'closer' | 'prospect';
          content: string;
          timestamp_ms: number;
        };
        if (p.type === 'final') {
          setInterimEntry(null);
          setTranscriptEntries((prev) => [
            ...prev,
            { ...p, id: `${p.timestamp_ms}-${prev.length}` },
          ]);
        } else {
          setInterimEntry({
            id: interimIdRef.current,
            type: 'interim',
            speaker: p.speaker,
            content: p.content,
            timestamp_ms: p.timestamp_ms,
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setTranscriptionStatus('live');
      });

    talkRatioCh
      .on('broadcast', { event: 'talk_ratio' }, ({ payload }) => {
        setTalkRatio(payload as TalkRatio);
      })
      .subscribe();

    statusCh
      .on('broadcast', { event: 'status' }, ({ payload }) => {
        const p = payload as { status: 'transcription_paused' | 'transcription_resumed' };
        setTranscriptionStatus(p.status === 'transcription_paused' ? 'paused' : 'live');
      })
      .subscribe();

    return () => {
      void transcriptCh.unsubscribe();
      void talkRatioCh.unsubscribe();
      void statusCh.unsubscribe();
    };
  }, [callId, call?.status]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptEntries, interimEntry, isAtBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  // ── Remove bot ──────────────────────────────────────────────────────────

  const handleRemoveBot = async () => {
    if (!callId || removing) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await api.delete(`/calls/${callId}/bot`);
      navigate('/dashboard');
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Failed to remove bot');
      setRemoving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
        <AlertCircle size={32} />
        <p>Call not found.</p>
        <Link to="/dashboard" className="text-blue-400 text-sm hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isActive = call.status === 'bot_joining' || call.status === 'live';
  const isLive = call.status === 'live';

  // Non-live states: joining, failed, processing
  if (!isLive) {
    return (
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <StatusDot status={call.status} />
              {call.prospect_name ? `Call with ${call.prospect_name}` : 'Active Call'}
            </h1>
            <p className="text-sm mt-0.5 text-amber-400">
              {call.status === 'bot_joining'
                ? 'Bot joining…'
                : call.status === 'processing'
                ? 'Processing…'
                : call.status}
            </p>
          </div>
          {isActive && (
            <button
              onClick={handleRemoveBot}
              disabled={removing}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Remove Bot
            </button>
          )}
        </div>

        {removeError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-4">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{removeError}</p>
          </div>
        )}

        {call.status === 'bot_joining' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300 flex items-start gap-2.5">
            <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Bot is joining the meeting</p>
              <p className="text-amber-400/70 mt-0.5">
                If your meeting has a waiting room, admit the bot to start coaching.
              </p>
            </div>
          </div>
        )}

        {call.status === 'processing' && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300 flex items-start gap-2.5">
            <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Processing your call…</p>
              <p className="text-blue-400/70 mt-0.5">
                Generating summary, health score, and follow-up email. This takes ~30 seconds.
              </p>
            </div>
          </div>
        )}

        {call.status === 'failed' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
            <p className="font-medium">Bot failed to join</p>
            {call.error_message && (
              <p className="text-red-400/70 mt-0.5">{call.error_message}</p>
            )}
            <Link to="/call/new" className="text-blue-400 hover:underline mt-2 inline-block">
              Try again
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Live call: two-panel layout
  const allEntries: TranscriptEntry[] = interimEntry
    ? [...transcriptEntries, interimEntry]
    : transcriptEntries;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0f0f0f] shrink-0">
        <div className="flex items-center gap-3">
          <StatusDot status="live" />
          <span className="text-sm font-medium text-white">
            {call.prospect_name ? `Call with ${call.prospect_name}` : 'Live Call'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
            <Clock size={11} />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TranscriptionStatusPill status={transcriptionStatus} />
          <button
            onClick={handleRemoveBot}
            disabled={removing}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remove Bot
          </button>
        </div>
      </div>

      {removeError && (
        <div className="flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-4 py-2 shrink-0">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{removeError}</p>
        </div>
      )}

      {/* Two-panel area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — transcript (60%) */}
        <div className="flex flex-col w-3/5 border-r border-white/5 overflow-hidden relative">
          <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Radio size={13} className="text-gray-600" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Live Transcript
              </span>
            </div>
          </div>

          {allEntries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-600 text-center px-6">
                {transcriptionStatus === 'connecting'
                  ? 'Waiting for audio stream…'
                  : transcriptionStatus === 'paused'
                  ? 'Transcription paused — reconnecting to Deepgram…'
                  : 'Listening… transcript appears as people speak'}
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
            >
              {allEntries.map((entry) => (
                <TranscriptLine key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {!isAtBottom && allEntries.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg transition-colors"
            >
              <ArrowDown size={12} />
              Jump to latest
            </button>
          )}
        </div>

        {/* Right — cue cards (40%, populated in Module 6) */}
        <div className="flex flex-col w-2/5 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5 shrink-0">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Cue Cards
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-gray-600 text-center">
              Waiting for cues…
              <br />
              <span className="text-xs text-gray-700 mt-1 block">
                Objection coaching appears here in real time
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom — talk ratio bar */}
      <div className="px-4 py-2.5 border-t border-white/5 bg-[#0f0f0f] shrink-0">
        <TalkRatioBar ratio={talkRatio} />
      </div>
    </div>
  );
}
