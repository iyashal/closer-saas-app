import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

export type TimeRange = 'week' | 'month' | 'all';

export interface CloserStats {
  total_calls: number;
  close_rate: number | null;
  revenue_closed: number;
  avg_deal_size: number | null;
  avg_deal_health: number | null;
  avg_talk_ratio: number | null;
  total_duration_minutes: number;
}

export interface TeamStats extends CloserStats {
  active_closers: number;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: null;
  calls_this_period: number;
  close_rate: number | null;
  revenue_closed: number;
  avg_deal_health: number | null;
  rank: number;
  trend: 'up' | 'down' | 'flat';
}

export interface RecentCall {
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

function getStartDate(timeRange: TimeRange): string | null {
  if (timeRange === 'all') return null;
  const now = new Date();
  now.setDate(now.getDate() - (timeRange === 'week' ? 7 : 30));
  return now.toISOString();
}

function getPreviousPeriodBounds(timeRange: TimeRange): { from: string; to: string } | null {
  if (timeRange === 'all') return null;
  const days = timeRange === 'week' ? 7 : 30;
  const to = new Date();
  to.setDate(to.getDate() - days);
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

function closeRate(closedCount: number, decidedCount: number): number | null {
  if (decidedCount === 0) return null;
  return Math.round((closedCount / decidedCount) * 100);
}

function computeStats(calls: Array<{
  outcome: string | null;
  deal_value: number | null;
  deal_health_score: number | null;
  talk_ratio_closer?: number | null;
  duration_seconds: number | null;
}>): Omit<CloserStats, 'avg_talk_ratio'> & { avg_talk_ratio: number | null } {
  const totalCalls = calls.length;
  const closed = calls.filter((c) => c.outcome === 'closed');
  const decided = calls.filter((c) => ['closed', 'lost', 'follow_up'].includes(c.outcome ?? ''));
  const revenueClosed = closed.reduce((s, c) => s + (c.deal_value ?? 0), 0);
  const closedWithValue = closed.filter((c) => c.deal_value != null);
  const avgDealSize =
    closedWithValue.length > 0
      ? closedWithValue.reduce((s, c) => s + (c.deal_value ?? 0), 0) / closedWithValue.length
      : null;
  const withHealth = calls.filter((c) => c.deal_health_score != null);
  const avgDealHealth =
    withHealth.length > 0
      ? Math.round(withHealth.reduce((s, c) => s + (c.deal_health_score ?? 0), 0) / withHealth.length)
      : null;
  const withRatio = calls.filter((c) => (c.talk_ratio_closer ?? null) != null);
  const avgTalkRatio =
    withRatio.length > 0
      ? Math.round(withRatio.reduce((s, c) => s + (c.talk_ratio_closer ?? 0), 0) / withRatio.length)
      : null;
  const totalDurationMinutes = Math.round(
    calls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60,
  );

  return {
    total_calls: totalCalls,
    close_rate: closeRate(closed.length, decided.length),
    revenue_closed: revenueClosed,
    avg_deal_size: avgDealSize != null ? Math.round(avgDealSize) : null,
    avg_deal_health: avgDealHealth,
    avg_talk_ratio: avgTalkRatio,
    total_duration_minutes: totalDurationMinutes,
  };
}

export async function getCloserStats(
  userId: string,
  orgId: string,
  timeRange: TimeRange,
): Promise<CloserStats> {
  const startDate = getStartDate(timeRange);

  let query = supabase
    .from('calls')
    .select('outcome, deal_value, deal_health_score, talk_ratio_closer, duration_seconds')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('status', 'completed');

  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ userId, orgId, timeRange, err: error }, 'getCloserStats failed');
    throw error;
  }

  return computeStats(data ?? []);
}

export async function getTeamStats(orgId: string, timeRange: TimeRange): Promise<TeamStats> {
  const startDate = getStartDate(timeRange);

  let query = supabase
    .from('calls')
    .select('user_id, outcome, deal_value, deal_health_score, talk_ratio_closer, duration_seconds')
    .eq('org_id', orgId)
    .eq('status', 'completed');

  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ orgId, timeRange, err: error }, 'getTeamStats failed');
    throw error;
  }

  const calls = data ?? [];
  const stats = computeStats(calls);
  const activeClosers = new Set(calls.map((c) => c.user_id)).size;

  return { ...stats, active_closers: activeClosers };
}

export async function getLeaderboard(
  orgId: string,
  timeRange: TimeRange,
): Promise<LeaderboardEntry[]> {
  const startDate = getStartDate(timeRange);
  const prevBounds = getPreviousPeriodBounds(timeRange);

  let query = supabase
    .from('calls')
    .select('user_id, outcome, deal_value, deal_health_score')
    .eq('org_id', orgId)
    .eq('status', 'completed');

  if (startDate) query = query.gte('created_at', startDate);

  const { data: currentCalls, error: err1 } = await query;
  if (err1) {
    logger.error({ orgId, err: err1 }, 'getLeaderboard current period query failed');
    throw err1;
  }

  // Previous period for trend
  const prevCloseRateMap = new Map<string, number>();
  if (prevBounds) {
    const { data: prevCalls } = await supabase
      .from('calls')
      .select('user_id, outcome')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .gte('created_at', prevBounds.from)
      .lt('created_at', prevBounds.to);

    const prevByUser = new Map<string, string[]>();
    for (const c of prevCalls ?? []) {
      if (!prevByUser.has(c.user_id)) prevByUser.set(c.user_id, []);
      prevByUser.get(c.user_id)!.push(c.outcome ?? '');
    }
    for (const [uid, outcomes] of prevByUser) {
      const decided = outcomes.filter((o) => ['closed', 'lost', 'follow_up'].includes(o)).length;
      const closed = outcomes.filter((o) => o === 'closed').length;
      prevCloseRateMap.set(uid, closeRate(closed, decided) ?? 0);
    }
  }

  // Get org members for names
  const { data: members } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('org_id', orgId);

  const nameMap = new Map((members ?? []).map((m) => [m.id, m.full_name as string | null]));

  // Group current calls by user
  const byUser = new Map<string, typeof currentCalls>();
  for (const c of currentCalls ?? []) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
    byUser.get(c.user_id)!.push(c);
  }

  const entries: LeaderboardEntry[] = [];
  for (const [userId, calls] of byUser) {
    const decided = calls.filter((c) =>
      ['closed', 'lost', 'follow_up'].includes(c.outcome ?? ''),
    ).length;
    const closed = calls.filter((c) => c.outcome === 'closed').length;
    const cr = closeRate(closed, decided);
    const revenue = calls
      .filter((c) => c.outcome === 'closed')
      .reduce((s, c) => s + (c.deal_value ?? 0), 0);
    const withHealth = calls.filter((c) => c.deal_health_score != null);
    const avgHealth =
      withHealth.length > 0
        ? Math.round(withHealth.reduce((s, c) => s + (c.deal_health_score ?? 0), 0) / withHealth.length)
        : null;

    const prevRate = prevCloseRateMap.get(userId);
    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (timeRange !== 'all' && prevRate !== undefined && cr !== null) {
      if (cr > prevRate) trend = 'up';
      else if (cr < prevRate) trend = 'down';
    }

    entries.push({
      user_id: userId,
      full_name: nameMap.get(userId) ?? null,
      avatar_url: null,
      calls_this_period: calls.length,
      close_rate: cr,
      revenue_closed: revenue,
      avg_deal_health: avgHealth,
      rank: 0,
      trend,
    });
  }

  entries.sort((a, b) => {
    const rA = a.close_rate ?? -1;
    const rB = b.close_rate ?? -1;
    if (rB !== rA) return rB - rA;
    return b.revenue_closed - a.revenue_closed;
  });

  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}

export async function getRecentCalls(
  userId: string,
  orgId: string,
  scope: 'own' | 'team',
  limit: number,
): Promise<RecentCall[]> {
  let query = supabase
    .from('calls')
    .select('id, prospect_name, outcome, deal_value, deal_health_score, duration_seconds, created_at, user_id, offers(name)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (scope === 'own') {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;
  if (error) {
    logger.error({ userId, orgId, scope, err: error }, 'getRecentCalls failed');
    throw error;
  }

  const calls = data ?? [];

  // Fetch closer names for team scope
  let nameMap = new Map<string, string | null>();
  if (scope === 'team' && calls.length > 0) {
    const uniqueUserIds = [...new Set(calls.map((c) => c.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', uniqueUserIds);
    nameMap = new Map((users ?? []).map((u) => [u.id, u.full_name as string | null]));
  }

  return calls.map((c) => ({
    id: c.id,
    prospect_name: c.prospect_name,
    offer_name: (c.offers as { name?: string } | null)?.name ?? null,
    outcome: c.outcome,
    deal_value: c.deal_value,
    deal_health_score: c.deal_health_score,
    duration_seconds: c.duration_seconds,
    created_at: c.created_at,
    ...(scope === 'team' ? { closer_name: nameMap.get(c.user_id) ?? null } : {}),
  }));
}
