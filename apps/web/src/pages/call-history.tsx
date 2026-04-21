import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrg } from '@/hooks/use-org';
import { api } from '@/lib/api';
import ScopeToggle from '@/components/analytics/ScopeToggle';

type Outcome = 'all' | 'closed' | 'follow_up' | 'lost';

interface HistoryCall {
  id: string;
  prospect_name: string | null;
  offer_name: string | null;
  outcome: string | null;
  deal_value: number | null;
  deal_health_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  framework_used: string | null;
  closer_name?: string | null;
}

interface HistoryResponse {
  calls: HistoryCall[];
  total: number;
  page: number;
  limit: number;
}

const outcomeStyles: Record<string, string> = {
  closed: 'text-green-400 bg-green-400/10',
  follow_up: 'text-blue-400 bg-blue-400/10',
  lost: 'text-red-400 bg-red-400/10',
};

const outcomeLabel: Record<string, string> = {
  closed: 'Closed',
  follow_up: 'Follow-up',
  lost: 'Lost',
};

function healthColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const LIMIT = 20;

export default function CallHistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') ?? '1');
  const outcome = (searchParams.get('outcome') ?? 'all') as Outcome;
  const scope = (searchParams.get('scope') ?? 'own') as 'own' | 'team';

  const { isAdmin, isTeamPlan } = useOrg();
  const showScopeToggle = isAdmin && isTeamPlan;

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const qs = `page=${page}&limit=${LIMIT}&outcome=${outcome}&scope=${scope}`;
      const res = await api.get<HistoryResponse>(`/calls/history?${qs}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, outcome, scope]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const setParam = (key: string, value: string) =>
    setSearchParams((p) => {
      p.set(key, value);
      if (key !== 'page') p.set('page', '1');
      return p;
    });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  const OUTCOME_OPTIONS: { label: string; value: Outcome }[] = [
    { label: 'All Outcomes', value: 'all' },
    { label: 'Closed', value: 'closed' },
    { label: 'Follow-Up', value: 'follow_up' },
    { label: 'Lost', value: 'lost' },
  ];

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Call History</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.total} call{data.total === 1 ? '' : 's'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showScopeToggle && (
            <ScopeToggle value={scope} onChange={(v) => setParam('scope', v)} />
          )}
          {/* Outcome filter */}
          <div className="flex items-center bg-[#1a1a1a] border border-white/5 rounded-lg p-0.5">
            {OUTCOME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setParam('outcome', opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  outcome === opt.value
                    ? 'bg-[#141414] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-gray-500 font-medium px-6 py-3">Date</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Prospect</th>
                {showScopeToggle && scope === 'team' && (
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Closer</th>
                )}
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Offer</th>
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Outcome</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Deal Value</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Health</th>
                <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Duration</th>
                <th className="text-right text-xs text-gray-500 font-medium px-6 py-3">Framework</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {[...Array(8)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data || data.calls.length === 0 ? (
                <tr>
                  <td
                    colSpan={showScopeToggle && scope === 'team' ? 9 : 8}
                    className="px-6 py-16 text-center text-gray-600 text-sm"
                  >
                    No calls found for this filter.
                  </td>
                </tr>
              ) : (
                data.calls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => navigate(`/calls/${call.id}/summary`)}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(call.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {call.prospect_name ?? (
                        <span className="text-gray-600 italic">Unknown</span>
                      )}
                    </td>
                    {showScopeToggle && scope === 'team' && (
                      <td className="px-4 py-3 text-gray-400">{call.closer_name ?? '—'}</td>
                    )}
                    <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">
                      {call.offer_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {call.outcome ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            outcomeStyles[call.outcome] ?? 'text-gray-400'
                          }`}
                        >
                          {outcomeLabel[call.outcome] ?? call.outcome}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {call.deal_value != null ? `$${call.deal_value.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {call.deal_health_score != null ? (
                        <span className={healthColor(call.deal_health_score)}>
                          {call.deal_health_score}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {call.duration_seconds ? formatDuration(call.duration_seconds) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {call.framework_used ? (
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {call.framework_used.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {data?.total ?? 0} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParam('page', String(page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
