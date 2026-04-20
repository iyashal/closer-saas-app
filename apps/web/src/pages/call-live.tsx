import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  Radio,
  Trash2,
  AlertCircle,
  ArrowDown,
  Mic,
  MicOff,
  Keyboard,
  X,
  WifiOff,
} from 'lucide-react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Call } from '@/types';
import { CallTimer } from '@/components/call/CallTimer';
import { TranscriptLine } from '@/components/call/TranscriptLine';
import type { TranscriptEntry } from '@/components/call/TranscriptLine';
import { TalkRatioBar } from '@/components/call/TalkRatioBar';
import { LiveAlertBar } from '@/components/call/LiveAlertBar';
import { CueCard } from '@/components/call/CueCard';
import type { ActiveCueCard } from '@/components/call/CueCard';
import { useRealtimeCueCards } from '@/hooks/use-realtime-cue-cards';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallWithOffer extends Call {
  offers: { name: string; price: number } | null;
}

interface TalkRatio {
  closer_ratio: number;
  prospect_ratio: number;
  total_seconds: number;
}

type TranscriptionStatus = 'connecting' | 'live' | 'paused';
type ModalType = null | 'mark-closed' | 'end-call' | 'shortcuts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
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

function MarkClosedModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (dealValue: number | null) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(value);
    onConfirm(isNaN(parsed) ? null : parsed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-1">Mark as Closed</h2>
        <p className="text-sm text-gray-500 mb-4">Enter the deal value (optional).</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Deal Value</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="5000"
                className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Mark Closed
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EndCallModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-white mb-1">End Call</h2>
        <p className="text-sm text-gray-500 mb-5">
          This will remove the bot and queue your call for processing. The summary will be ready in
          about 30 seconds.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            End Call
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { key: 'C', label: 'Mark Closed' },
    { key: 'F', label: 'Mark Follow-Up' },
    { key: 'E', label: 'End Call' },
    { key: 'U', label: 'Mark top card as Used' },
    { key: 'Esc', label: 'Dismiss top cue card' },
    { key: '?', label: 'Toggle this help' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/15 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{label}</span>
              <kbd className="bg-white/5 border border-white/10 text-gray-400 text-xs px-2 py-1 rounded font-mono">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallLivePage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();

  const [call, setCall] = useState<CallWithOffer | null>(null);
  const [loading, setLoading] = useState(true);

  // Transcript
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);
  const [interimEntry, setInterimEntry] = useState<TranscriptEntry | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>('connecting');
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Talk ratio
  const [talkRatio, setTalkRatio] = useState<TalkRatio | null>(null);
  const [highTalkRatioSince, setHighTalkRatioSince] = useState<number | null>(null);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedRef = useRef(0);

  // Last transcript time (for silence detection)
  const [lastTranscriptSeconds, setLastTranscriptSeconds] = useState<number | null>(null);

  // Buying signal
  const [hasPendingBuyingSignal, setHasPendingBuyingSignal] = useState(false);
  const buyingSignalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cue cards
  const handleNewCard = useCallback((card: ActiveCueCard) => {
    if (card.card.category.includes('buying_signal')) {
      setHasPendingBuyingSignal(true);
      if (buyingSignalTimerRef.current) clearTimeout(buyingSignalTimerRef.current);
      buyingSignalTimerRef.current = setTimeout(() => setHasPendingBuyingSignal(false), 30_000);
    }
  }, []);

  const { cards: cueCards, dismiss: dismissCard, markUsed } = useRealtimeCueCards(callId ?? '', {
    onCardArrived: handleNewCard,
  });

  // Scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const interimIdRef = useRef(`interim-${Date.now()}`);

  // Modals & actions
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Refs for intervals
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch call & poll ────────────────────────────────────────────────────

  const fetchCall = useCallback(async () => {
    if (!callId) return;
    try {
      const data = await api.get<CallWithOffer>(`/calls/${callId}`);
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
    void fetchCall();
    pollRef.current = setInterval(() => void fetchCall(), 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchCall]);

  // ── Call timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!call?.started_at || call.status !== 'live') return;
    const startMs = new Date(call.started_at).getTime();
    const tick = () => {
      const s = Math.floor((Date.now() - startMs) / 1_000);
      setElapsedSeconds(s);
      elapsedRef.current = s;
    };
    tick();
    timerRef.current = setInterval(tick, 1_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.started_at, call?.status]);

  // ── Talk ratio high-water tracking ───────────────────────────────────────

  useEffect(() => {
    if (!talkRatio) return;
    if (talkRatio.closer_ratio > 0.6) {
      setHighTalkRatioSince((prev) => (prev !== null ? prev : elapsedRef.current));
    } else {
      setHighTalkRatioSince(null);
    }
  }, [talkRatio]);

  // ── Supabase Realtime ────────────────────────────────────────────────────

  useEffect(() => {
    if (!callId || call?.status !== 'live') return;

    setTranscriptionStatus('connecting');
    setRealtimeConnected(false);

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
          is_objection?: boolean;
          is_buying_signal?: boolean;
        };
        if (p.type === 'final') {
          setInterimEntry(null);
          setTranscriptEntries((prev) => [
            ...prev,
            { ...p, id: `${p.timestamp_ms}-${prev.length}`, type: 'final' as const },
          ]);
          setLastTranscriptSeconds(elapsedRef.current);
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
        if (status === 'SUBSCRIBED') {
          setTranscriptionStatus('live');
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setRealtimeConnected(false);
        }
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

  // ── Auto-scroll ──────────────────────────────────────────────────────────

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

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleMarkClosed = async (dealValue: number | null) => {
    if (!callId) return;
    setPendingAction('mark-closed');
    try {
      await api.patch(`/calls/${callId}`, {
        outcome: 'closed',
        ...(dealValue !== null ? { deal_value: dealValue } : {}),
      });
      setCall((prev) => prev ? { ...prev, outcome: 'closed', deal_value: dealValue } : prev);
      setActiveModal(null);
    } finally {
      setPendingAction(null);
    }
  };

  const handleMarkFollowUp = async () => {
    if (!callId || pendingAction) return;
    setPendingAction('follow-up');
    try {
      await api.patch(`/calls/${callId}`, { outcome: 'follow_up' });
      setCall((prev) => prev ? { ...prev, outcome: 'follow_up' } : prev);
    } finally {
      setPendingAction(null);
    }
  };

  const handleEndCall = async () => {
    if (!callId) return;
    setPendingAction('end-call');
    try {
      await api.post(`/calls/${callId}/end`, {});
      navigate('/dashboard');
    } catch {
      setPendingAction(null);
      setActiveModal(null);
    }
  };

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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    if (call?.status !== 'live') return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'c':
          setActiveModal((m) => (m ? null : 'mark-closed'));
          break;
        case 'f':
          void handleMarkFollowUp();
          break;
        case 'e':
          setActiveModal((m) => (m ? null : 'end-call'));
          break;
        case 'Escape':
          if (activeModal) {
            setActiveModal(null);
          } else if (cueCards.length > 0) {
            dismissCard(cueCards[cueCards.length - 1].shownId);
          }
          break;
        case 'u':
          if (cueCards.length > 0) {
            markUsed(cueCards[cueCards.length - 1].shownId);
          }
          break;
        case '?':
          setActiveModal((m) => (m === 'shortcuts' ? null : 'shortcuts'));
          break;
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.status, cueCards, activeModal, dismissCard, markUsed]);

  // ── Render ───────────────────────────────────────────────────────────────

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

  // ── Non-live states ──────────────────────────────────────────────────────

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
                  ? 'Processing call…'
                  : call.status}
            </p>
          </div>
          {isActive && (
            <button
              onClick={() => void handleRemoveBot()}
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

  // ── Live call layout ─────────────────────────────────────────────────────

  const allEntries: TranscriptEntry[] = interimEntry
    ? [...transcriptEntries, interimEntry]
    : transcriptEntries;

  const closerRatio = talkRatio?.closer_ratio ?? 0;
  const prospectRatio = talkRatio?.prospect_ratio ?? 0;
  const isWarning =
    closerRatio > 0.6 &&
    highTalkRatioSince !== null &&
    elapsedSeconds - highTalkRatioSince >= 120;

  const outcomeLabel =
    call.outcome === 'closed'
      ? '✓ Closed'
      : call.outcome === 'follow_up'
        ? '↗ Follow-Up'
        : null;

  return (
    <>
      {/* Modals */}
      {activeModal === 'mark-closed' && (
        <MarkClosedModal
          onConfirm={(v) => void handleMarkClosed(v)}
          onCancel={() => setActiveModal(null)}
          loading={pendingAction === 'mark-closed'}
        />
      )}
      {activeModal === 'end-call' && (
        <EndCallModal
          onConfirm={() => void handleEndCall()}
          onCancel={() => setActiveModal(null)}
          loading={pendingAction === 'end-call'}
        />
      )}
      {activeModal === 'shortcuts' && (
        <ShortcutsModal onClose={() => setActiveModal(null)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0f0f0f] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <StatusDot status="live" />
            <span className="text-sm font-medium text-white truncate">
              {call.prospect_name ? `Call with ${call.prospect_name}` : 'Live Call'}
            </span>
            {outcomeLabel && (
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
                {outcomeLabel}
              </span>
            )}
            <CallTimer elapsedSeconds={elapsedSeconds} />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!realtimeConnected && call.status === 'live' && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <WifiOff size={12} />
                <span>Reconnecting…</span>
              </div>
            )}
            <TranscriptionStatusPill status={transcriptionStatus} />
          </div>
        </div>

        {removeError && (
          <div className="flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-4 py-2 shrink-0">
            <AlertCircle size={13} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{removeError}</p>
          </div>
        )}

        {/* Two-panel area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left — transcript (60%) */}
          <div className="flex flex-col border-r border-white/5 overflow-hidden relative w-3/5 min-w-[320px]">
            <div className="px-4 py-2 border-b border-white/5 shrink-0">
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
                      ? 'Transcription paused — reconnecting…'
                      : 'Listening… transcript appears as people speak'}
                </p>
              </div>
            ) : (
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
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

          {/* Right — cue cards (40%) */}
          <div className="flex flex-col w-2/5 min-w-[280px] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Cue Cards
                </span>
                {cueCards.length > 0 && (
                  <span className="text-xs text-gray-600 bg-white/5 px-1.5 py-0.5 rounded-full">
                    {cueCards.length}
                  </span>
                )}
              </div>
            </div>

            {cueCards.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-1">
                  <p className="text-sm text-gray-600">Waiting for cues…</p>
                  <p className="text-xs text-gray-700">
                    Objection coaching appears here in real time
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {[...cueCards].reverse().map((cueCard, idx) => (
                  <CueCard
                    key={cueCard.shownId}
                    cueCard={cueCard}
                    isTop={idx === 0}
                    onDismiss={dismissCard}
                    onUsed={markUsed}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 bg-[#0f0f0f] shrink-0">
          {/* Talk ratio row */}
          <div className="px-4 pt-2.5 pb-1.5">
            <TalkRatioBar
              closerRatio={closerRatio}
              prospectRatio={prospectRatio}
              isWarning={isWarning}
            />
          </div>

          {/* Alert + actions row */}
          <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
            {/* Left: alert bar */}
            <div className="flex-1 min-w-0">
              <LiveAlertBar
                elapsedSeconds={elapsedSeconds}
                closerRatio={closerRatio}
                highTalkRatioSince={highTalkRatioSince}
                lastTranscriptSeconds={lastTranscriptSeconds}
                hasPendingBuyingSignal={hasPendingBuyingSignal}
              />
            </div>

            {/* Center: offer + prospect info */}
            {(call.offers || call.prospect_name) && (
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-600 shrink-0">
                {call.prospect_name && (
                  <span className="text-gray-400">{call.prospect_name}</span>
                )}
                {call.offers && (
                  <>
                    {call.prospect_name && <span>·</span>}
                    <span>{call.offers.name}</span>
                    <span className="text-gray-500 font-medium">
                      {formatCurrency(call.offers.price)}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveModal('mark-closed')}
                disabled={!!pendingAction || call.outcome === 'closed'}
                className="flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {pendingAction === 'mark-closed' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                Mark Closed
              </button>

              <button
                onClick={() => void handleMarkFollowUp()}
                disabled={!!pendingAction || call.outcome === 'follow_up'}
                className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {pendingAction === 'follow-up' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                Follow-Up
              </button>

              <button
                onClick={() => setActiveModal('end-call')}
                disabled={!!pendingAction}
                className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {pendingAction === 'end-call' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                End Call
              </button>

              <button
                onClick={() => void handleRemoveBot()}
                disabled={removing}
                className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove Bot
              </button>

              <button
                onClick={() => setActiveModal('shortcuts')}
                className="text-gray-700 hover:text-gray-500 transition-colors p-1.5 rounded-lg hover:bg-white/5"
                title="Keyboard shortcuts"
              >
                <Keyboard size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
