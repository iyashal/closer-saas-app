import { useNavigate } from 'react-router-dom';
import { timeAgo } from '../../lib/utils';

interface RecentCall {
  id: string;
  prospect_name: string | null;
  offer_name: string | null;
  outcome: string | null;
  deal_value: number | null;
  deal_health_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  closer_name?: string | null;
}

interface Props {
  calls: RecentCall[];
  showCloserColumn?: boolean;
  loading?: boolean;
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
  return `${m}m`;
}

export default function RecentCallsTable({ calls, showCloserColumn, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">No calls in this period.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Prospect</th>
            {showCloserColumn && (
              <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Closer</th>
            )}
            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Offer</th>
            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Outcome</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Deal Value</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Health</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Duration</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/call/${c.id}`)}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
            >
              <td className="py-3 pr-4">
                <span className="text-white">
                  {c.prospect_name ?? <span className="text-gray-600 italic">Unknown</span>}
                </span>
              </td>
              {showCloserColumn && (
                <td className="py-3 pr-4 text-gray-400">{c.closer_name ?? '—'}</td>
              )}
              <td className="py-3 pr-4 text-gray-400 max-w-[140px] truncate">
                {c.offer_name ?? '—'}
              </td>
              <td className="py-3 pr-4">
                {c.outcome ? (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${outcomeStyles[c.outcome] ?? 'text-gray-400'}`}
                  >
                    {outcomeLabel[c.outcome] ?? c.outcome}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right text-gray-300">
                {c.deal_value != null ? `$${c.deal_value.toLocaleString()}` : '—'}
              </td>
              <td className="py-3 pr-4 text-right">
                {c.deal_health_score != null ? (
                  <span className={healthColor(c.deal_health_score)}>{c.deal_health_score}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right text-gray-500">
                {c.duration_seconds ? formatDuration(c.duration_seconds) : '—'}
              </td>
              <td className="py-3 text-right text-gray-600 text-xs whitespace-nowrap">
                {timeAgo(c.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
