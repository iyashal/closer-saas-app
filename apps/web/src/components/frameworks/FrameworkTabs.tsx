import { Star } from 'lucide-react';
import type { Framework } from '@/types';

const TABS: { id: Framework; label: string }[] = [
  { id: 'unicorn_closer', label: 'Unicorn Closer' },
  { id: 'nepq', label: 'NEPQ' },
  { id: 'straight_line', label: 'Straight Line' },
];

interface Props {
  active: Framework;
  defaultFramework: Framework;
  onChange: (fw: Framework) => void;
}

export function FrameworkTabs({ active, defaultFramework, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-[#141414] rounded-xl border border-white/10 w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${active === tab.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'}
          `}
        >
          {tab.label}
          {tab.id === defaultFramework && (
            <Star
              size={11}
              className={active === tab.id ? 'text-yellow-300 fill-yellow-300' : 'text-yellow-500 fill-yellow-500'}
              aria-label="Active coaching framework"
            />
          )}
        </button>
      ))}
    </div>
  );
}
