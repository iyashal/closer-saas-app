import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Radio, Clock, User, Tag, Trash2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Call } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  bot_joining: 'Bot joining…',
  live: 'Live',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_COLORS: Record<string, string> = {
  bot_joining: 'text-amber-400',
  live: 'text-green-400',
  processing: 'text-blue-400',
  completed: 'text-gray-400',
  failed: 'text-red-400',
};

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

export default function CallLivePage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();

  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchCall() {
    try {
      const data = await api.get<Call>(`/calls/${callId}`);
      setCall(data);

      if (data.status === 'completed' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.status === 'completed') {
          navigate(`/calls/${callId}/summary`);
        }
      }
    } catch {
      if (pollRef.current) clearInterval(pollRef.current);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!callId) return;
    fetchCall();
    pollRef.current = setInterval(fetchCall, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [callId]);

  async function handleRemoveBot() {
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
  }

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
  const color = STATUS_COLORS[call.status] ?? 'text-gray-400';

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2.5">
            <StatusDot status={call.status} />
            {call.prospect_name ? `Call with ${call.prospect_name}` : 'Active Call'}
          </h1>
          <p className={`text-sm mt-0.5 ${color}`}>{STATUS_LABELS[call.status] ?? call.status}</p>
        </div>

        {isActive && (
          <button
            onClick={handleRemoveBot}
            disabled={removing}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {removing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
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

      <div className="bg-[#141414] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Radio size={15} className="text-gray-600" />
          <span className="text-gray-600">Meeting URL</span>
          <a
            href={call.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline truncate max-w-xs"
          >
            {call.meeting_url}
          </a>
        </div>

        {call.prospect_name && (
          <div className="flex items-center gap-2 text-sm">
            <User size={15} className="text-gray-600" />
            <span className="text-gray-600">Prospect</span>
            <span className="text-gray-300">{call.prospect_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock size={15} className="text-gray-600" />
          <span className="text-gray-600">Started</span>
          <span className="text-gray-300">
            {call.started_at ? new Date(call.started_at).toLocaleTimeString() : '—'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Tag size={15} className="text-gray-600" />
          <span className="text-gray-600">Framework</span>
          <span className="text-gray-300 capitalize">{call.framework_used}</span>
        </div>
      </div>

      {call.status === 'bot_joining' && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300 flex items-start gap-2.5">
          <Loader2 size={16} className="animate-spin mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Bot is joining the meeting</p>
            <p className="text-amber-400/70 mt-0.5">
              If your meeting has a waiting room, admit the bot to start coaching.
            </p>
          </div>
        </div>
      )}

      {call.status === 'live' && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-300">
          <p className="font-medium">Bot is live in the meeting</p>
          <p className="text-green-400/70 mt-0.5">
            Live transcription and cue cards arrive in Module 7. For now you can track status here.
          </p>
        </div>
      )}

      {call.status === 'failed' && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
          <p className="font-medium">Bot failed to join</p>
          {call.error_message && <p className="text-red-400/70 mt-0.5">{call.error_message}</p>}
          <Link to="/call/new" className="text-blue-400 hover:underline mt-2 inline-block">
            Try again
          </Link>
        </div>
      )}

      {!isActive && call.status !== 'failed' && (
        <div className="mt-4 flex justify-end">
          <Link
            to="/dashboard"
            className="text-sm text-blue-400 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
