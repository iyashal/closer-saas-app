import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  calls_this_period: number;
  close_rate: number | null;
  revenue_closed: number;
  avg_deal_health: number | null;
  rank: number;
  trend: 'up' | 'down' | 'flat';
}

interface Props {
  entries: LeaderboardEntry[];
  onCloserClick?: (userId: string, name: string | null) => void;
  loading?: boolean;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <Trophy size={16} className="text-yellow-400" />;
  if (rank === 2)
    return <Trophy size={16} className="text-gray-400" />;
  if (rank === 3)
    return <Trophy size={16} className="text-amber-700" />;
  return <span className="text-sm text-gray-600 font-medium w-4 text-center">{rank}</span>;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-green-400" />;
  if (trend === 'down') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-600" />;
}

function healthColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export default function LeaderboardTable({ entries, onCloserClick, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No completed calls yet this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4 w-10">Rank</th>
            <th className="text-left text-xs text-gray-500 font-medium pb-2 pr-4">Closer</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Calls</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Close Rate</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Revenue</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2 pr-4">Avg Health</th>
            <th className="text-right text-xs text-gray-500 font-medium pb-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.user_id}
              className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-3 pr-4">
                <div className="flex justify-center">
                  <RankBadge rank={e.rank} />
                </div>
              </td>
              <td className="py-3 pr-4">
                <button
                  onClick={() => onCloserClick?.(e.user_id, e.full_name)}
                  className="text-white hover:text-blue-400 transition-colors font-medium text-left"
                >
                  {e.full_name ?? 'Unknown'}
                </button>
              </td>
              <td className="py-3 pr-4 text-right text-gray-400">{e.calls_this_period}</td>
              <td className="py-3 pr-4 text-right">
                {e.close_rate != null ? (
                  <span className="text-white font-medium">{e.close_rate}%</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right text-gray-300">
                {e.revenue_closed > 0 ? `$${e.revenue_closed.toLocaleString()}` : '—'}
              </td>
              <td className="py-3 pr-4 text-right">
                {e.avg_deal_health != null ? (
                  <span className={healthColor(e.avg_deal_health)}>{e.avg_deal_health}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="py-3 text-right">
                <div className="flex justify-end">
                  <TrendIcon trend={e.trend} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
