import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Phone,
  DollarSign,
  Target,
  Plus,
  Users,
  Heart,
  Mic,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useOrg } from '@/hooks/use-org';
import { useTrial } from '@/hooks/use-trial';
import { api } from '@/lib/api';
import StatCard from '@/components/dashboard/StatCard';
import LiveNowBanner from '@/components/dashboard/LiveNowBanner';
import TimeRangeToggle from '@/components/dashboard/TimeRangeToggle';
import RecentCallsTable from '@/components/dashboard/RecentCallsTable';
import LeaderboardTable from '@/components/dashboard/LeaderboardTable';
import ViewAsBanner from '@/components/dashboard/ViewAsBanner';

type TimeRange = 'week' | 'month' | 'all';

interface CloserStats {
  total_calls: number;
  close_rate: number | null;
  revenue_closed: number;
  avg_deal_size: number | null;
  avg_deal_health: number | null;
  avg_talk_ratio: number | null;
  total_duration_minutes: number;
}

interface TeamStats extends CloserStats {
  active_closers: number;
}

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

interface LiveCall {
  id: string;
  prospect_name: string | null;
  status: string;
  offer_name: string | null;
  closer_name?: string | null;
}

function fmt$(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toLocaleString()}`;
}

// Closer view: stat cards + recent calls
function CloserView({
  range,
  userId,
  orgId,
}: {
  range: TimeRange;
  userId: string;
  orgId: string;
}) {
  const [stats, setStats] = useState<CloserStats | null>(null);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    api
      .get<CloserStats>(`/dashboard/my-stats?range=${range}&userId=${userId}`)
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    setCallsLoading(true);
    api
      .get<RecentCall[]>(`/dashboard/recent-calls?scope=own&limit=10&userId=${userId}`)
      .then(setCalls)
      .catch(() => {})
      .finally(() => setCallsLoading(false));
  }, [range, userId, orgId]);

  const talkRatioColor =
    stats?.avg_talk_ratio != null && stats.avg_talk_ratio > 60 ? 'amber' : 'default';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Close Rate"
          value={stats?.close_rate != null ? `${stats.close_rate}%` : '—'}
          icon={<TrendingUp size={18} />}
          emptyState={stats && stats.total_calls === 0 ? 'No calls yet' : undefined}
          loading={statsLoading}
        />
        <StatCard
          label={range === 'week' ? 'Calls This Week' : range === 'month' ? 'Calls This Month' : 'Total Calls'}
          value={stats ? String(stats.total_calls) : '—'}
          icon={<Phone size={18} />}
          emptyState={stats && stats.total_calls === 0 ? 'No calls yet' : undefined}
          loading={statsLoading}
        />
        <StatCard
          label="Revenue Closed"
          value={stats ? fmt$(stats.revenue_closed) : '—'}
          icon={<DollarSign size={18} />}
          emptyState={stats && stats.total_calls === 0 ? 'No calls yet' : undefined}
          loading={statsLoading}
        />
        <StatCard
          label="Avg Deal Size"
          value={fmt$(stats?.avg_deal_size ?? null)}
          icon={<Target size={18} />}
          emptyState={stats && stats.total_calls === 0 ? 'No calls yet' : undefined}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Avg Deal Health"
          value={stats?.avg_deal_health != null ? `${stats.avg_deal_health}/100` : '—'}
          icon={<Heart size={16} />}
          color={
            stats?.avg_deal_health == null
              ? 'default'
              : stats.avg_deal_health >= 70
              ? 'green'
              : stats.avg_deal_health >= 50
              ? 'amber'
              : 'red'
          }
          loading={statsLoading}
        />
        <StatCard
          label="Avg Talk Ratio"
          value={stats?.avg_talk_ratio != null ? `${stats.avg_talk_ratio}%` : '—'}
          icon={<Mic size={16} />}
          color={talkRatioColor}
          emptyState={talkRatioColor === 'amber' ? 'Try to stay under 60%' : undefined}
          loading={statsLoading}
        />
        <StatCard
          label="Hours on Calls"
          value={stats ? `${(stats.total_duration_minutes / 60).toFixed(1)}h` : '—'}
          icon={<Clock size={16} />}
          loading={statsLoading}
        />
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Calls</h2>
          <Link to="/calls" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all
          </Link>
        </div>
        {!callsLoading && calls.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={22} className="text-blue-400" />
            </div>
            <h3 className="text-white font-medium mb-1">No calls yet</h3>
            <p className="text-sm text-gray-500 mb-5">
              Launch your first bot and get live coaching on your next sales call.
            </p>
            <Link
              to="/call/new"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <Plus size={15} />
              New Call
            </Link>
          </div>
        ) : (
          <RecentCallsTable calls={calls} loading={callsLoading} />
        )}
      </div>
    </div>
  );
}

// Team view: team stats + leaderboard + team recent calls
function TeamView({
  range,
  orgId,
  onViewAsCloser,
}: {
  range: TimeRange;
  orgId: string;
  onViewAsCloser: (userId: string, name: string | null) => void;
}) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(true);
  const [callsLoading, setCallsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    api
      .get<TeamStats>(`/dashboard/team-stats?range=${range}`)
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    setLbLoading(true);
    api
      .get<LeaderboardEntry[]>(`/dashboard/leaderboard?range=${range}`)
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLbLoading(false));

    setCallsLoading(true);
    api
      .get<RecentCall[]>(`/dashboard/recent-calls?scope=team&limit=10`)
      .then(setCalls)
      .catch(() => {})
      .finally(() => setCallsLoading(false));
  }, [range, orgId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Team Close Rate"
          value={stats?.close_rate != null ? `${stats.close_rate}%` : '—'}
          icon={<TrendingUp size={18} />}
          emptyState={stats && stats.total_calls === 0 ? 'No calls yet' : undefined}
          loading={statsLoading}
        />
        <StatCard
          label="Total Calls"
          value={stats ? String(stats.total_calls) : '—'}
          icon={<Phone size={18} />}
          loading={statsLoading}
        />
        <StatCard
          label="Total Revenue"
          value={stats ? fmt$(stats.revenue_closed) : '—'}
          icon={<DollarSign size={18} />}
          loading={statsLoading}
        />
        <StatCard
          label="Active Closers"
          value={stats ? String(stats.active_closers) : '—'}
          icon={<Users size={18} />}
          emptyState={stats && stats.active_closers === 0 ? 'No activity' : undefined}
          loading={statsLoading}
        />
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Leaderboard</h2>
        <LeaderboardTable
          entries={leaderboard}
          onCloserClick={onViewAsCloser}
          loading={lbLoading}
        />
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Calls</h2>
          <Link to="/calls" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all
          </Link>
        </div>
        <RecentCallsTable calls={calls} showCloserColumn loading={callsLoading} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin, isTeamPlan } = useOrg();
  const { isExpired } = useTrial();
  const [searchParams, setSearchParams] = useSearchParams();

  const rangeParam = (searchParams.get('range') ?? 'week') as TimeRange;
  const range: TimeRange = ['week', 'month', 'all'].includes(rangeParam) ? rangeParam : 'week';

  const tabParam = searchParams.get('tab') as 'my' | 'team' | null;
  const viewAsParam = searchParams.get('view_as');

  const showTeamTab = isTeamPlan && isAdmin;
  const activeTab: 'my' | 'team' =
    showTeamTab && tabParam === 'my' ? 'my' : showTeamTab ? 'team' : 'my';

  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // View-as state: look up name from leaderboard
  const [viewAsName, setViewAsName] = useState<string | null>(null);

  const fetchLiveCalls = useCallback(() => {
    api
      .get<LiveCall[]>('/dashboard/live-calls')
      .then((data) => {
        setLiveCalls(data);
        setLastUpdated(new Date());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLiveCalls();
    const interval = setInterval(fetchLiveCalls, 10_000);
    return () => clearInterval(interval);
  }, [fetchLiveCalls]);

  const setRange = (r: TimeRange) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('range', r);
      return next;
    });
  };

  const setTab = (t: 'my' | 'team') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', t);
      next.delete('view_as');
      return next;
    });
    setViewAsName(null);
  };

  const handleViewAsCloser = (userId: string, name: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view_as', userId);
      next.set('tab', 'team');
      return next;
    });
    setViewAsName(name);
  };

  const handleExitViewAs = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('view_as');
      return next;
    });
    setViewAsName(null);
  };

  return (
    <div className="relative flex-1 overflow-y-auto p-6 space-y-6">
      {isExpired && (
        <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-semibold text-white mb-2">Your trial has ended</h2>
            <p className="text-gray-400 text-sm mb-6">
              Upgrade to keep AI coaching on every call. Your past data stays accessible.
            </p>
            <a
              href="/settings/billing"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg text-sm transition-colors"
            >
              View plans &amp; upgrade
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your performance overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeToggle value={range} onChange={setRange} />
          <Link
            to="/call/new"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus size={15} />
            New Call
          </Link>
        </div>
      </div>

      {/* View-as banner */}
      {viewAsParam && (
        <ViewAsBanner viewingName={viewAsName} onExit={handleExitViewAs} />
      )}

      {/* Team tabs */}
      {showTeamTab && !viewAsParam && (
        <div className="flex gap-1 border-b border-white/5">
          {(['team', 'my'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'team' ? 'Team Dashboard' : 'My Dashboard'}
            </button>
          ))}
        </div>
      )}

      {/* Live calls */}
      <LiveNowBanner liveCalls={liveCalls} />

      {/* Main content */}
      {viewAsParam ? (
        <CloserView range={range} userId={viewAsParam} orgId={user?.org_id ?? ''} />
      ) : activeTab === 'team' && showTeamTab ? (
        <TeamView
          range={range}
          orgId={user?.org_id ?? ''}
          onViewAsCloser={handleViewAsCloser}
        />
      ) : (
        <CloserView range={range} userId={user?.id ?? ''} orgId={user?.org_id ?? ''} />
      )}

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-xs text-gray-700 text-right">
          Last updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
