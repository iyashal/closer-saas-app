import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Call, TranscriptLine, UnicornCloserGrade, WhatYouShouldHaveSaid } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallWithDetails extends Call {
  offers?: {
    name: string;
    price: number;
    guarantee: string | null;
    description: string | null;
  };
  transcript_lines?: TranscriptLine[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function energyColor(val: number): string {
  if (val >= 7) return 'bg-green-500';
  if (val >= 4) return 'bg-blue-500';
  return 'bg-red-500';
}

// ─── Unicorn Closer Grade Card ────────────────────────────────────────────────

function UnicornGradeCard({ grade }: { grade: UnicornCloserGrade }) {
  const [expanded, setExpanded] = useState(true);
  const overallScore = Math.round(
    (grade.presence_score + grade.frame_control_score + grade.dot_connecting_score) / 3,
  );
  const talkRatioBreached = grade.talk_ratio_grade.includes('%') &&
    parseInt(grade.talk_ratio_grade.match(/\d+/)?.[0] ?? '0') > 30;

  const energies = [
    { key: 'abundance', label: 'Abundance', val: grade.leadership_energies.abundance },
    { key: 'direction', label: 'Direction', val: grade.leadership_energies.direction },
    { key: 'non_attachment', label: 'Non-attachment', val: grade.leadership_energies.non_attachment },
    { key: 'responsibility', label: 'Responsibility', val: grade.leadership_energies.responsibility },
    { key: 'curiosity', label: 'Curiosity', val: grade.leadership_energies.curiosity },
  ] as const;

  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-blue-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Unicorn Closer Grade</div>
            <div className="text-xs text-gray-500 mt-0.5">AI coaching report for this call</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-2xl font-bold tabular-nums ${scoreColor(overallScore)}`}>
            {overallScore}
            <span className="text-sm font-normal text-gray-500">/100</span>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-white/5 pt-5">

          {/* Three core scores */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Presence', score: grade.presence_score, notes: grade.presence_notes },
              { label: 'Frame Control', score: grade.frame_control_score, notes: grade.frame_control_notes },
              { label: 'Dot Connecting', score: grade.dot_connecting_score, notes: grade.dot_connecting_notes },
            ].map(({ label, score, notes }) => (
              <div key={label} className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}>
                  {score}<span className="text-sm font-normal text-gray-600">/100</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">{notes}</p>
              </div>
            ))}
          </div>

          {/* Leadership energies */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
              Leadership Energies
            </div>
            <div className="space-y-2.5">
              {energies.map(({ key, label, val }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-gray-400 shrink-0">{label}</div>
                  <div className="flex-1 bg-white/5 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${energyColor(val)}`}
                      style={{ width: `${val * 10}%` }}
                    />
                  </div>
                  <div className="w-6 text-right text-xs text-gray-400 tabular-nums">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Talk ratio callout */}
          {talkRatioBreached && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
              <AlertTriangle size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-400">Talk ratio exceeded 30%</div>
                <div className="text-xs text-amber-400/70 mt-0.5">{grade.talk_ratio_grade}</div>
              </div>
            </div>
          )}

          {/* 3 Whys depth */}
          <div className="bg-[#1a1a1a] rounded-lg px-4 py-3">
            <div className="text-xs text-gray-500 mb-1">Three Whys Depth</div>
            <div className="text-sm text-gray-300">{grade.three_whys_depth}</div>
          </div>

          {/* Rationalizations missed */}
          {grade.rationalizations_missed.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                Rationalizations You Missed ({grade.rationalizations_missed.length})
              </div>
              <div className="space-y-3">
                {grade.rationalizations_missed.map((r, i) => (
                  <div key={i} className="bg-[#1a1a1a] border border-red-500/10 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-medium">
                        {r.timestamp_ms > 0
                          ? `${Math.floor(r.timestamp_ms / 60000)}:${String(Math.floor((r.timestamp_ms % 60000) / 1000)).padStart(2, '0')}`
                          : 'During call'}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Prospect said</div>
                      <div className="text-sm text-gray-300 italic">"{r.what_prospect_said}"</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">You should have said</div>
                      <div className="text-sm text-white">{r.what_closer_should_have_said}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 3 improvements */}
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lightbulb size={13} className="text-blue-400" />
              Top 3 Improvements for Next Call
            </div>
            <ol className="space-y-2">
              {grade.top_three_improvements.map((item, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deal Health Gauge ────────────────────────────────────────────────────────

function DealHealthGauge({ score, reasoning }: { score: number; reasoning: string | null }) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white">Deal Health</div>
        <div className={`text-3xl font-bold tabular-nums ${scoreColor(score)}`}>
          {score}<span className="text-base font-normal text-gray-500">/100</span>
        </div>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all ${scoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {reasoning && <p className="text-xs text-gray-400 leading-relaxed">{reasoning}</p>}
    </div>
  );
}

// ─── Follow-up Email ──────────────────────────────────────────────────────────

function FollowUpEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare size={15} className="text-blue-400" />
          Follow-up Email
        </div>
        <button
          onClick={() => void copy()}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
        {email}
      </pre>
    </div>
  );
}

// ─── Objection Log ────────────────────────────────────────────────────────────

function ObjectionLog({ entries }: { entries: WhatYouShouldHaveSaid[] }) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
      <div className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Target size={15} className="text-amber-400" />
        What You Should Have Said
      </div>
      <div className="space-y-4">
        {entries.map((entry, i) => (
          <div key={i} className="border-l-2 border-white/10 pl-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-gray-600" />
              <span className="text-xs text-gray-500">
                {entry.timestamp > 0
                  ? `${Math.floor(entry.timestamp / 60000)}:${String(Math.floor((entry.timestamp % 60000) / 1000)).padStart(2, '0')}`
                  : 'During call'}
              </span>
            </div>
            <div className="text-xs text-gray-500">Prospect said</div>
            <div className="text-sm text-gray-300 italic">"{entry.objection}"</div>
            <div className="text-xs text-gray-500 mt-2">Your response</div>
            <div className="text-sm text-gray-400">{entry.your_response}</div>
            <div className="text-xs text-gray-500 mt-2">Better response</div>
            <div className="text-sm text-white">{entry.better_response}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CallSummaryPage() {
  const { callId } = useParams<{ callId: string }>();
  const [call, setCall] = useState<CallWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCall = useCallback(async () => {
    if (!callId) return;
    try {
      const data = await api.get<CallWithDetails>(`/calls/${callId}`);
      setCall(data);
    } catch {
      // silent — keep showing what we have
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    void fetchCall();
  }, [fetchCall]);

  // Poll while processing
  useEffect(() => {
    if (!call || call.status === 'completed' || call.status === 'failed') return;
    const interval = setInterval(() => void fetchCall(), 5_000);
    return () => clearInterval(interval);
  }, [call, fetchCall]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-600" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Call not found.</p>
        <Link to="/dashboard" className="text-blue-400 hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  if (call.status === 'processing' || call.status === 'bot_joining' || call.status === 'live') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 size={28} className="animate-spin text-gray-500" />
        <div className="text-center space-y-1">
          <p className="text-white font-medium">
            {call.status === 'processing' ? 'Generating your AI coaching report…' : 'Call in progress…'}
          </p>
          <p className="text-sm text-gray-500">This usually takes 30–60 seconds.</p>
        </div>
        <Link to="/dashboard" className="text-blue-400 hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  if (call.status === 'failed') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Something went wrong</p>
          <p className="text-sm text-gray-500 mt-1">{call.error_message ?? 'This call could not be processed.'}</p>
        </div>
        <Link to="/dashboard" className="text-blue-400 hover:underline text-sm">Back to dashboard</Link>
      </div>
    );
  }

  const hasWyshs = (call.what_you_should_have_said?.length ?? 0) > 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link to="/call-history" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-white truncate">
              {call.prospect_name ? `Call with ${call.prospect_name}` : 'Call Summary'}
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {call.offers && <span>{call.offers.name}</span>}
              {call.duration_seconds && <span>{formatDuration(call.duration_seconds)}</span>}
              {call.outcome && (
                <span className={
                  call.outcome === 'closed' ? 'text-green-400' :
                  call.outcome === 'follow_up' ? 'text-blue-400' : 'text-red-400'
                }>
                  {call.outcome === 'closed' ? 'Closed' : call.outcome === 'follow_up' ? 'Follow-up' : 'Lost'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Unicorn Closer Grade — shown first when available */}
        {call.unicorn_closer_grade && (
          <UnicornGradeCard grade={call.unicorn_closer_grade} />
        )}

        {/* Deal Health */}
        {call.deal_health_score != null && (
          <DealHealthGauge score={call.deal_health_score} reasoning={call.deal_health_reasoning} />
        )}

        {/* AI Summary */}
        {call.summary && (
          <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
            <div className="text-sm font-semibold text-white mb-3">AI Summary</div>
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {call.summary}
            </div>
          </div>
        )}

        {/* What You Should Have Said */}
        {hasWyshs && (
          <ObjectionLog entries={call.what_you_should_have_said!} />
        )}

        {/* Next Steps */}
        {(call.next_steps?.length ?? 0) > 0 && (
          <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
            <div className="text-sm font-semibold text-white mb-3">Next Steps</div>
            <ul className="space-y-2">
              {call.next_steps!.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded border border-white/20 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-300">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Email */}
        {call.follow_up_email && <FollowUpEmail email={call.follow_up_email} />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <Link to="/call-history" className="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-1.5">
            <ArrowLeft size={14} />
            All calls
          </Link>
          <span className="text-xs text-gray-600 font-mono">{call.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
}
