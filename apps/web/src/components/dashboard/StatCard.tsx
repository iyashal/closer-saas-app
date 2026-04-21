import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: number | null;
  color?: 'default' | 'green' | 'amber' | 'red';
  emptyState?: string;
  loading?: boolean;
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-400">
        <TrendingUp size={12} />+{trend}%
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-400">
        <TrendingDown size={12} />{trend}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-500">
      <Minus size={12} />0%
    </span>
  );
}

const colorMap = {
  default: 'text-white',
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

export default function StatCard({ label, value, icon, trend, color = 'default', emptyState, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-[#141414] border border-white/5 rounded-xl p-5 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-24 mb-3" />
        <div className="h-8 bg-white/5 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        {icon && <div className="text-gray-600">{icon}</div>}
      </div>
      <div className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</div>
      <div className="mt-1 flex items-center gap-2">
        {trend != null && <TrendBadge trend={trend} />}
        {emptyState && trend == null && (
          <span className="text-xs text-gray-600">{emptyState}</span>
        )}
      </div>
    </div>
  );
}
