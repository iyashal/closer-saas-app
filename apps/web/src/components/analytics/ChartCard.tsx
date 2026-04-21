import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  loading?: boolean;
  isEmpty?: boolean;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, loading, isEmpty, children, className }: Props) {
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-xl p-6 ${className ?? ''}`}>
      <div className="mb-5">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-48 bg-white/5 rounded-lg" />
        </div>
      ) : isEmpty ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-gray-600 text-sm">No data yet for this period</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
