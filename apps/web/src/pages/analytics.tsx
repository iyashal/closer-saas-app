import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Plus } from 'lucide-react';
import { useOrg } from '@/hooks/use-org';
import { api } from '@/lib/api';
import ChartCard from '@/components/analytics/ChartCard';
import DateRangeSelector from '@/components/analytics/DateRangeSelector';
import ScopeToggle from '@/components/analytics/ScopeToggle';

type ChartRange = '7' | '30' | '90' | 'all';
type Scope = 'own' | 'team';

interface TrendPoint {
  date: string;
  close_rate: number;
  calls: number;
}

interface TrendSeries {
  user_id: string;
  full_name: string | null;
  data: TrendPoint[];
}

interface CloseRateTrendResult {
  data: TrendPoint[];
  series?: TrendSeries[];
}

interface ObjectionFreqPoint {
  category: string;
  count: number;
  handled_well: number;
}

interface CueCardEffectivenessResult {
  total_shown: number;
  total_used: number;
  usage_rate: number;
  by_category: Array<{ category: string; shown: number; used: number; rate: number }>;
}

interface TalkRatioPoint {
  date: string;
  closer_ratio: number;
  prospect_ratio: number;
}

interface DealHealthPoint {
  date: string;
  avg_score: number;
  calls: number;
}

interface RevenueTrendPoint {
  date: string;
  revenue: number;
  deals: number;
}

const SERIES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function formatBucketDate(date: string, range: ChartRange): string {
  if (range === '90' || range === 'all') {
    const [year, month] = date.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCategory(cat: string): string {
  return cat.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function fmtDollar(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toLocaleString()}`;
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number;
  color?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  valueFormatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1f2937] border border-[#374151] rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="text-gray-400 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-white flex items-center gap-1.5">
          <span style={{ color: entry.color }}>●</span>
          {entry.name ? `${entry.name}: ` : ''}
          {valueFormatter && entry.value != null
            ? valueFormatter(entry.value, entry.name ?? '')
            : entry.value}
        </p>
      ))}
    </div>
  );
}

function mergeSeriesForChart(
  aggregateData: TrendPoint[],
  series: TrendSeries[],
): Record<string, unknown>[] {
  const dateSet = new Set<string>();
  aggregateData.forEach((p) => dateSet.add(p.date));
  series.forEach((s) => s.data.forEach((p) => dateSet.add(p.date)));

  return Array.from(dateSet)
    .sort()
    .map((date) => {
      const point: Record<string, unknown> = { date };
      series.forEach((s) => {
        const p = s.data.find((d) => d.date === date);
        point[s.user_id] = p?.close_rate ?? null;
      });
      return point;
    });
}

function useChartData<T>(endpoint: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<T>(endpoint)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, loading };
}

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = (searchParams.get('range') ?? '30') as ChartRange;
  const scope = (searchParams.get('scope') ?? 'own') as Scope;

  const { isAdmin, isTeamPlan } = useOrg();
  const showScopeToggle = isAdmin && isTeamPlan;

  const setRange = useCallback(
    (v: ChartRange) => setSearchParams((p) => { p.set('range', v); return p; }),
    [setSearchParams],
  );
  const setScope = useCallback(
    (v: Scope) => setSearchParams((p) => { p.set('scope', v); return p; }),
    [setSearchParams],
  );

  const qs = `range=${range}&scope=${scope}`;

  const { data: closeRateData, loading: closeRateLoading } =
    useChartData<CloseRateTrendResult>(`/analytics/close-rate-trend?${qs}`);
  const { data: revenueData, loading: revenueLoading } =
    useChartData<RevenueTrendPoint[]>(`/analytics/revenue-trend?${qs}`);
  const { data: objectionData, loading: objectionLoading } =
    useChartData<ObjectionFreqPoint[]>(`/analytics/objection-frequency?${qs}`);
  const { data: cueCardData, loading: cueCardLoading } =
    useChartData<CueCardEffectivenessResult>(`/analytics/cue-card-effectiveness?${qs}`);
  const { data: talkRatioData, loading: talkRatioLoading } =
    useChartData<TalkRatioPoint[]>(`/analytics/talk-ratio-trend?${qs}`);
  const { data: dealHealthData, loading: dealHealthLoading } =
    useChartData<DealHealthPoint[]>(`/analytics/deal-health-trend?${qs}`);

  const anyLoading = closeRateLoading || revenueLoading;
  const hasNoData =
    !anyLoading &&
    closeRateData?.data.length === 0 &&
    (!revenueData || revenueData.length === 0);

  const avgCloseRate =
    closeRateData?.data && closeRateData.data.length > 0
      ? Math.round(
          closeRateData.data.reduce((s, p) => s + p.close_rate, 0) /
            closeRateData.data.length,
        )
      : null;

  const closeRateChartData =
    closeRateData && scope === 'team' && closeRateData.series?.length
      ? mergeSeriesForChart(closeRateData.data, closeRateData.series)
      : (closeRateData?.data ?? []);

  const objectionChartData = (objectionData ?? []).map((d) => ({
    ...d,
    missed: d.count - d.handled_well,
    label: formatCategory(d.category),
  }));

  const pieData = cueCardData
    ? [
        { name: 'Used', value: cueCardData.total_used, color: '#10b981' },
        {
          name: 'Dismissed',
          value: Math.max(0, cueCardData.total_shown - cueCardData.total_used),
          color: '#374151',
        },
      ]
    : [];

  const xTickFormatter = (v: string) => formatBucketDate(v, range);

  return (
    <div className="p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track performance over time</p>
        </div>
        <div className="flex items-center gap-3">
          {showScopeToggle && <ScopeToggle value={scope} onChange={setScope} />}
          <DateRangeSelector value={range} onChange={setRange} />
        </div>
      </div>

      {/* Zero-state */}
      {hasNoData ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-gray-400 text-lg font-medium mb-2">No calls yet</p>
          <p className="text-gray-600 text-sm mb-6">
            Complete your first call to see analytics
          </p>
          <Link
            to="/call/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} /> New Call
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Row 1: Close Rate (full width) */}
          <ChartCard
            title="Close Rate Over Time"
            subtitle={avgCloseRate != null ? `Overall average: ${avgCloseRate}%` : undefined}
            loading={closeRateLoading}
            isEmpty={!closeRateLoading && closeRateData?.data.length === 0}
          >
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={closeRateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={xTickFormatter}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v, name) =>
                        name === 'calls' ? `${v} calls` : `${v}%`
                      }
                    />
                  }
                  cursor={{ stroke: 'rgba(59,130,246,0.15)', strokeWidth: 1 }}
                />
                {avgCloseRate != null && (
                  <ReferenceLine
                    y={avgCloseRate}
                    stroke="#9ca3af"
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg ${avgCloseRate}%`,
                      fill: '#9ca3af',
                      fontSize: 10,
                      position: 'right',
                    }}
                  />
                )}
                {scope === 'team' && closeRateData?.series?.length ? (
                  <>
                    {closeRateData.series.map((s, i) => (
                      <Line
                        key={s.user_id}
                        type="monotone"
                        dataKey={s.user_id}
                        stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                        strokeWidth={1.5}
                        dot={false}
                        name={s.full_name ?? 'Closer'}
                        connectNulls
                      />
                    ))}
                    <Legend
                      formatter={(value: string) => {
                        const s = closeRateData.series?.find((x) => x.user_id === value);
                        return s?.full_name ?? 'Closer';
                      }}
                      wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="close_rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Close Rate"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row 2: Revenue (full width) */}
          <ChartCard
            title="Revenue Over Time"
            subtitle="Closed deals only"
            loading={revenueLoading}
            isEmpty={!revenueLoading && (!revenueData || revenueData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={xTickFormatter}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={fmtDollar}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v, name) =>
                        name === 'deals'
                          ? `${v} deal${v === 1 ? '' : 's'}`
                          : fmtDollar(v)
                      }
                    />
                  }
                  cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row 3: Objection Frequency + Cue Card Effectiveness */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Objection Frequency"
              subtitle="Handled (green) vs missed (dark)"
              loading={objectionLoading}
              isEmpty={!objectionLoading && (!objectionData || objectionData.length === 0)}
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={objectionChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                  />
                  <Bar
                    dataKey="handled_well"
                    stackId="a"
                    fill="#10b981"
                    name="Handled"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="missed"
                    stackId="a"
                    fill="#374151"
                    name="Missed"
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Cue Card Effectiveness"
              subtitle="How often closers acted on coaching cards"
              loading={cueCardLoading}
              isEmpty={!cueCardLoading && cueCardData?.total_shown === 0}
            >
              {cueCardData && cueCardData.total_shown > 0 && (
                <div className="flex flex-col items-center">
                  <div className="relative w-[200px] h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          strokeWidth={0}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">
                          {cueCardData.usage_rate}%
                        </div>
                        <div className="text-xs text-gray-500">used</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 w-full max-w-xs px-4">
                    {cueCardData.by_category.slice(0, 4).map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-400 truncate mr-2">
                          {formatCategory(cat.category)}
                        </span>
                        <span className="text-gray-300 shrink-0">
                          {cat.used}/{cat.shown} ({cat.rate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Row 4: Talk Ratio + Deal Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Talk Ratio Trend"
              subtitle="Closer % (blue) vs prospect % — target: ≤30% closer"
              loading={talkRatioLoading}
              isEmpty={!talkRatioLoading && (!talkRatioData || talkRatioData.length === 0)}
            >
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={talkRatioData ?? []}>
                  <defs>
                    <linearGradient id="closerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="prospectGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v) => `${v}%`} />}
                    cursor={{ stroke: 'rgba(59,130,246,0.15)', strokeWidth: 1 }}
                  />
                  <ReferenceLine
                    y={30}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Target: 30%',
                      fill: '#f59e0b',
                      fontSize: 10,
                      position: 'right',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="closer_ratio"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#closerGrad)"
                    name="Closer"
                  />
                  <Area
                    type="monotone"
                    dataKey="prospect_ratio"
                    stroke="#6b7280"
                    strokeWidth={1.5}
                    fill="url(#prospectGrad)"
                    name="Prospect"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Deal Health Trend"
              subtitle="Average deal health score (0–100)"
              loading={dealHealthLoading}
              isEmpty={!dealHealthLoading && (!dealHealthData || dealHealthData.length === 0)}
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dealHealthData ?? []}>
                  <ReferenceArea y1={0} y2={30} fill="rgba(239,68,68,0.04)" />
                  <ReferenceArea y1={30} y2={60} fill="rgba(245,158,11,0.04)" />
                  <ReferenceArea y1={60} y2={100} fill="rgba(16,185,129,0.04)" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={xTickFormatter}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        valueFormatter={(v, name) =>
                          name === 'calls' ? `${v} call${v === 1 ? '' : 's'}` : `${v}/100`
                        }
                      />
                    }
                    cursor={{ stroke: 'rgba(59,130,246,0.15)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_score"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="Avg Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
