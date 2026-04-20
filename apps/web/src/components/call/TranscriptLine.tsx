export interface TranscriptEntry {
  id: string;
  type: 'final' | 'interim';
  speaker: 'closer' | 'prospect';
  content: string;
  timestamp_ms: number;
  is_objection?: boolean;
  is_buying_signal?: boolean;
}

function formatTimestamp(timestampMs: number): string {
  const totalSec = Math.max(0, Math.floor(timestampMs / 1000));
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  entry: TranscriptEntry;
}

export function TranscriptLine({ entry }: Props) {
  const isCloser = entry.speaker === 'closer';

  let borderClass = 'border-l-2 border-transparent';
  if (entry.is_objection) borderClass = 'border-l-2 border-red-500/50';
  else if (entry.is_buying_signal) borderClass = 'border-l-2 border-green-500/50';

  return (
    <div
      className={`
        flex flex-col gap-0.5 pl-3
        ${borderClass}
        ${entry.type === 'interim' ? 'opacity-50' : 'opacity-100'}
      `}
    >
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isCloser ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          {isCloser ? 'You' : 'Prospect'}
        </span>
        <span className="text-[10px] text-gray-700 tabular-nums">
          {formatTimestamp(entry.timestamp_ms)}
        </span>
        {entry.is_objection && (
          <span className="text-[10px] text-red-500/70 font-medium">objection</span>
        )}
        {entry.is_buying_signal && (
          <span className="text-[10px] text-green-500/70 font-medium">buying signal</span>
        )}
      </div>
      <p
        className={`text-sm leading-relaxed ${isCloser ? 'text-gray-100' : 'text-gray-300'} ${
          entry.type === 'interim' ? 'italic' : ''
        }`}
      >
        {entry.content}
      </p>
    </div>
  );
}
