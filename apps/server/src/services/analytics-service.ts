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

// ── Chart analytics ─────────────────────────────────────────────────────────

export type ChartRange = '7' | '30' | '90' | 'all';

export interface TrendPoint {
  date: string;
  close_rate: number;
  calls: number;
}

export interface TrendSeries {
  user_id: string;
  full_name: string | null;
  data: TrendPoint[];
}

export interface CloseRateTrendResult {
  data: TrendPoint[];
  series?: TrendSeries[];
}

export interface ObjectionFreqPoint {
  category: string;
  count: number;
  handled_well: number;
}

export interface CueCardEffectivenessResult {
  total_shown: number;
  total_used: number;
  usage_rate: number;
  by_category: Array<{ category: string; shown: number; used: number; rate: number }>;
}

export interface TalkRatioPoint {
  date: string;
  closer_ratio: number;
  prospect_ratio: number;
}

export interface DealHealthPoint {
  date: string;
  avg_score: number;
  calls: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  deals: number;
}

function getChartStartDate(range: ChartRange): string | null {
  if (range === 'all') return null;
  const now = new Date();
  now.setDate(now.getDate() - parseInt(range));
  return now.toISOString();
}

function getBucketKey(dateStr: string, range: ChartRange): string {
  const d = new Date(dateStr);
  if (range === '7') {
    return d.toISOString().slice(0, 10);
  } else if (range === '30') {
    const dow = d.getDay();
    const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10);
  } else {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}

async function getCallIdsForChart(
  userId: string,
  orgId: string,
  scope: 'own' | 'team',
  startDate: string | null,
): Promise<string[]> {
  let query = supabase
    .from('calls')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'completed');
  if (scope === 'own') query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);
  const { data } = await query;
  return (data ?? []).map((c) => c.id);
}

export async function getCloseRateTrend(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<CloseRateTrendResult> {
  const startDate = getChartStartDate(range);

  let query = supabase
    .from('calls')
    .select('user_id, outcome, created_at')
    .eq('org_id', orgId)
    .eq('status', 'completed');
  if (scope === 'own') query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ userId, orgId, range, scope, err: error }, 'getCloseRateTrend failed');
    throw error;
  }

  const calls = data ?? [];

  const agg = new Map<string, { closed: number; decided: number; total: number }>();
  for (const c of calls) {
    const key = getBucketKey(c.created_at, range);
    if (!agg.has(key)) agg.set(key, { closed: 0, decided: 0, total: 0 });
    const b = agg.get(key)!;
    b.total++;
    if (['closed', 'lost', 'follow_up'].includes(c.outcome ?? '')) b.decided++;
    if (c.outcome === 'closed') b.closed++;
  }

  const aggregateData: TrendPoint[] = Array.from(agg.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      close_rate: b.decided > 0 ? Math.round((b.closed / b.decided) * 100) : 0,
      calls: b.total,
    }));

  if (scope !== 'team') return { data: aggregateData };

  const byUser = new Map<string, typeof calls>();
  for (const c of calls) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
    byUser.get(c.user_id)!.push(c);
  }

  const { data: members } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('org_id', orgId);
  const nameMap = new Map((members ?? []).map((m) => [m.id, m.full_name as string | null]));

  const series: TrendSeries[] = [];
  for (const [uid, userCalls] of byUser) {
    const userAgg = new Map<string, { closed: number; decided: number; total: number }>();
    for (const c of userCalls) {
      const key = getBucketKey(c.created_at, range);
      if (!userAgg.has(key)) userAgg.set(key, { closed: 0, decided: 0, total: 0 });
      const b = userAgg.get(key)!;
      b.total++;
      if (['closed', 'lost', 'follow_up'].includes(c.outcome ?? '')) b.decided++;
      if (c.outcome === 'closed') b.closed++;
    }
    series.push({
      user_id: uid,
      full_name: nameMap.get(uid) ?? null,
      data: Array.from(userAgg.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, b]) => ({
          date,
          close_rate: b.decided > 0 ? Math.round((b.closed / b.decided) * 100) : 0,
          calls: b.total,
        })),
    });
  }

  return { data: aggregateData, series };
}

export async function getObjectionFrequency(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<ObjectionFreqPoint[]> {
  const startDate = getChartStartDate(range);
  const callIds = await getCallIdsForChart(userId, orgId, scope, startDate);
  if (callIds.length === 0) return [];

  const { data, error } = await supabase
    .from('cue_cards_shown')
    .select('was_used, framework_cards(category)')
    .in('call_id', callIds);

  if (error) {
    logger.error({ userId, orgId, range, scope, err: error }, 'getObjectionFrequency failed');
    throw error;
  }

  const catMap = new Map<string, { count: number; handled: number }>();
  for (const row of data ?? []) {
    const category = (row.framework_cards as { category?: string } | null)?.category;
    if (!category) continue;
    if (!catMap.has(category)) catMap.set(category, { count: 0, handled: 0 });
    const c = catMap.get(category)!;
    c.count++;
    if (row.was_used) c.handled++;
  }

  return Array.from(catMap.entries())
    .map(([category, { count, handled }]) => ({ category, count, handled_well: handled }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getCueCardEffectiveness(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<CueCardEffectivenessResult> {
  const startDate = getChartStartDate(range);
  const callIds = await getCallIdsForChart(userId, orgId, scope, startDate);
  if (callIds.length === 0) {
    return { total_shown: 0, total_used: 0, usage_rate: 0, by_category: [] };
  }

  const { data, error } = await supabase
    .from('cue_cards_shown')
    .select('was_used, framework_cards(category)')
    .in('call_id', callIds);

  if (error) {
    logger.error({ err: error }, 'getCueCardEffectiveness failed');
    throw error;
  }

  const rows = data ?? [];
  const totalShown = rows.length;
  const totalUsed = rows.filter((r) => r.was_used).length;

  const catMap = new Map<string, { shown: number; used: number }>();
  for (const row of rows) {
    const cat = (row.framework_cards as { category?: string } | null)?.category ?? 'other';
    if (!catMap.has(cat)) catMap.set(cat, { shown: 0, used: 0 });
    const c = catMap.get(cat)!;
    c.shown++;
    if (row.was_used) c.used++;
  }

  return {
    total_shown: totalShown,
    total_used: totalUsed,
    usage_rate: totalShown > 0 ? Math.round((totalUsed / totalShown) * 100) : 0,
    by_category: Array.from(catMap.entries()).map(([category, { shown, used }]) => ({
      category,
      shown,
      used,
      rate: shown > 0 ? Math.round((used / shown) * 100) : 0,
    })),
  };
}

export async function getTalkRatioTrend(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<TalkRatioPoint[]> {
  const startDate = getChartStartDate(range);

  let query = supabase
    .from('calls')
    .select('talk_ratio_closer, talk_ratio_prospect, created_at')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .not('talk_ratio_closer', 'is', null);
  if (scope === 'own') query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ err: error }, 'getTalkRatioTrend failed');
    throw error;
  }

  const buckets = new Map<string, { closerSum: number; prospectSum: number; count: number }>();
  for (const c of data ?? []) {
    const key = getBucketKey(c.created_at, range);
    if (!buckets.has(key)) buckets.set(key, { closerSum: 0, prospectSum: 0, count: 0 });
    const b = buckets.get(key)!;
    b.closerSum += c.talk_ratio_closer ?? 0;
    b.prospectSum += c.talk_ratio_prospect ?? 0;
    b.count++;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      closer_ratio: b.count > 0 ? Math.round(b.closerSum / b.count) : 0,
      prospect_ratio: b.count > 0 ? Math.round(b.prospectSum / b.count) : 0,
    }));
}

export async function getDealHealthTrend(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<DealHealthPoint[]> {
  const startDate = getChartStartDate(range);

  let query = supabase
    .from('calls')
    .select('deal_health_score, created_at')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .not('deal_health_score', 'is', null);
  if (scope === 'own') query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ err: error }, 'getDealHealthTrend failed');
    throw error;
  }

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const c of data ?? []) {
    const key = getBucketKey(c.created_at, range);
    if (!buckets.has(key)) buckets.set(key, { sum: 0, count: 0 });
    const b = buckets.get(key)!;
    b.sum += c.deal_health_score ?? 0;
    b.count++;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({
      date,
      avg_score: b.count > 0 ? Math.round(b.sum / b.count) : 0,
      calls: b.count,
    }));
}

export async function getRevenueTrend(
  userId: string,
  orgId: string,
  range: ChartRange,
  scope: 'own' | 'team',
): Promise<RevenueTrendPoint[]> {
  const startDate = getChartStartDate(range);

  let query = supabase
    .from('calls')
    .select('deal_value, created_at')
    .eq('org_id', orgId)
    .eq('status', 'completed')
    .eq('outcome', 'closed');
  if (scope === 'own') query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);

  const { data, error } = await query;
  if (error) {
    logger.error({ err: error }, 'getRevenueTrend failed');
    throw error;
  }

  const buckets = new Map<string, { revenue: number; deals: number }>();
  for (const c of data ?? []) {
    const key = getBucketKey(c.created_at, range);
    if (!buckets.has(key)) buckets.set(key, { revenue: 0, deals: 0 });
    const b = buckets.get(key)!;
    b.revenue += c.deal_value ?? 0;
    b.deals++;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, revenue: b.revenue, deals: b.deals }));
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
