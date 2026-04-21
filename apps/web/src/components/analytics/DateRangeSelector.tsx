type ChartRange = '7' | '30' | '90' | 'all';

interface Props {
  value: ChartRange;
  onChange: (v: ChartRange) => void;
}

const OPTIONS: { label: string; value: ChartRange }[] = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
  { label: 'All Time', value: 'all' },
];

export default function DateRangeSelector({ value, onChange }: Props) {
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
