const CATEGORY_LABELS: Record<string, string> = {
  price_objection: 'Price Objection',
  spouse_objection: 'Spouse Objection',
  think_about_it: 'Think About It',
  send_info: 'Send Info',
  trust_objection: 'Trust Objection',
  timing_objection: 'Timing Objection',
  competitor_objection: 'Competitor',
  buying_signal_next_steps: 'Buying Signal: Next Steps',
  buying_signal_desire: 'Buying Signal: Desire',
  coaching_talk_ratio: 'Coaching: Talk Ratio',
  coaching_trial_close: 'Coaching: Trial Close',
};

interface Props {
  categories: string[];
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategorySidebar({ categories, counts, selected, onSelect }: Props) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="w-52 flex-shrink-0 space-y-0.5">
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
          selected === null
            ? 'bg-blue-600/20 text-blue-400 font-medium'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <span>All Categories</span>
        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{total}</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            selected === cat
              ? 'bg-blue-600/20 text-blue-400 font-medium'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="text-left leading-tight">{CATEGORY_LABELS[cat] ?? cat}</span>
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
            {counts[cat] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}
