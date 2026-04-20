import { Clock } from 'lucide-react';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  elapsedSeconds: number;
}

export function CallTimer({ elapsedSeconds }: Props) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <Clock size={12} />
      <span className="font-mono tabular-nums">{formatDuration(elapsedSeconds)}</span>
    </div>
  );
}
