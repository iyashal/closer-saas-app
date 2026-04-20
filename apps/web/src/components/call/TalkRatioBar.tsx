interface Props {
  closerRatio: number;
  prospectRatio: number;
  isWarning: boolean;
}

export function TalkRatioBar({ closerRatio, prospectRatio, isWarning }: Props) {
  const closerPct = Math.round(closerRatio * 100);
  const prospectPct = Math.round(prospectRatio * 100);

  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        className={`text-xs font-medium w-14 shrink-0 tabular-nums ${
          isWarning ? 'text-amber-400' : 'text-blue-400'
        }`}
      >
        You {closerPct}%
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden min-w-[80px]">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isWarning ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${closerPct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium w-20 text-right shrink-0 tabular-nums">
        {prospectPct}% Prospect
      </span>
    </div>
  );
}
