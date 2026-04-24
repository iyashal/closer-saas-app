import type { PlanInfo } from '@/hooks/use-plan';

interface UsageCardProps {
  planInfo: PlanInfo;
}

export default function UsageCard({ planInfo }: UsageCardProps) {
  if (planInfo.plan !== 'starter') return null;

  const used = planInfo.calls_used_today ?? 0;
  const limit = planInfo.limits.calls_per_day ?? 3;
  const pct = Math.min(100, (used / limit) * 100);
  const isWarning = used >= limit - 1 && used < limit;
  const isMax = used >= limit;

  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Daily Calls</h3>
          <p className="text-xs text-gray-500 mt-0.5">Starter plan · resets at midnight UTC</p>
        </div>
        <span className={`text-sm font-semibold ${isMax ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-gray-300'}`}>
          {used}/{limit}
        </span>
      </div>

      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isMax ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isMax && (
        <p className="text-xs text-red-400">
          Daily limit reached. Upgrade to Solo for unlimited calls.
        </p>
      )}
    </div>
  );
}
