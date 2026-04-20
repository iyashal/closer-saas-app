import { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import type { FrameworkCard } from '@/types';

export interface ActiveCueCard {
  shownId: string;
  card: FrameworkCard;
  triggerText: string | null;
  confidence: number;
  shownAt: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  price_objection: 'Price',
  spouse_objection: 'Spouse',
  think_about_it: 'Think About It',
  send_info: 'Send Info',
  trust_objection: 'Trust',
  timing_objection: 'Timing',
  competitor_objection: 'Competitor',
  buying_signal_next_steps: 'Buying Signal',
  buying_signal_desire: 'Buying Signal',
  coaching_talk_ratio: 'Coaching',
  coaching_trial_close: 'Trial Close',
};

const CATEGORY_COLORS: Record<string, string> = {
  price_objection: 'bg-red-500/20 text-red-400',
  spouse_objection: 'bg-red-500/20 text-red-400',
  think_about_it: 'bg-amber-500/20 text-amber-400',
  send_info: 'bg-amber-500/20 text-amber-400',
  trust_objection: 'bg-red-500/20 text-red-400',
  timing_objection: 'bg-amber-500/20 text-amber-400',
  competitor_objection: 'bg-orange-500/20 text-orange-400',
  buying_signal_next_steps: 'bg-green-500/20 text-green-400',
  buying_signal_desire: 'bg-green-500/20 text-green-400',
  coaching_talk_ratio: 'bg-blue-500/20 text-blue-400',
  coaching_trial_close: 'bg-blue-500/20 text-blue-400',
};

const DEFAULT_COLOR = 'bg-gray-500/20 text-gray-400';

interface Props {
  cueCard: ActiveCueCard;
  isTop: boolean;
  onDismiss: (shownId: string) => void;
  onUsed: (shownId: string) => void;
}

export function CueCard({ cueCard, isTop, onDismiss, onUsed }: Props) {
  const [mounted, setMounted] = useState(false);
  const { card, triggerText, shownId } = cueCard;

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const categoryLabel = CATEGORY_LABELS[card.category] ?? card.category.replace(/_/g, ' ');
  const categoryColor = CATEGORY_COLORS[card.category] ?? DEFAULT_COLOR;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}
        bg-[#1a1a1a] border rounded-xl p-4 space-y-3 flex-shrink-0
        ${isTop ? 'border-white/15 shadow-lg shadow-black/40' : 'border-white/8'}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryColor}`}
        >
          {categoryLabel}
        </span>
        <button
          onClick={() => onDismiss(shownId)}
          className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
          aria-label="Dismiss card"
        >
          <X size={14} />
        </button>
      </div>

      {triggerText && (
        <p className="text-xs text-gray-600 italic leading-snug">
          &ldquo;{triggerText}&rdquo;
        </p>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {card.title}
        </p>
        <p className="text-sm leading-relaxed text-gray-100">{card.suggested_response}</p>
      </div>

      {card.framework_reference && (
        <p className="text-[10px] text-gray-700 font-medium">{card.framework_reference}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onUsed(shownId)}
          className="flex items-center gap-1.5 flex-1 justify-center bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <CheckCircle size={12} />
          Used This
        </button>
        <button
          onClick={() => onDismiss(shownId)}
          className="flex-1 justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
