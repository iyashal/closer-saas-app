interface Props {
  value: 'week' | 'month' | 'all';
  onChange: (v: 'week' | 'month' | 'all') => void;
}

const OPTIONS: { label: string; value: 'week' | 'month' | 'all' }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

export default function TimeRangeToggle({ value, onChange }: Props) {
  return (
    <div className="flex items-center bg-[#1a1a1a] border border-white/5 rounded-lg p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-[#141414] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
