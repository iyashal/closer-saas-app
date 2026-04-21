import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

interface LiveCall {
  id: string;
  prospect_name: string | null;
  status: string;
  offer_name: string | null;
  closer_name?: string | null;
}

interface Props {
  liveCalls: LiveCall[];
}

export default function LiveNowBanner({ liveCalls }: Props) {
  if (liveCalls.length === 0) return null;

  return (
    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-green-300 flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
        </span>
        Live Now
      </h2>
      <div className="space-y-2">
        {liveCalls.map((c) => (
          <Link
            key={c.id}
            to={`/call/${c.id}`}
            className="flex items-center justify-between bg-[#141414] border border-white/5 rounded-lg px-4 py-2.5 hover:border-green-500/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Radio size={15} className="text-green-400 shrink-0" />
              <span className="text-sm text-white">
                {c.closer_name ? `${c.closer_name} — ` : ''}
                {c.prospect_name ? `Call with ${c.prospect_name}` : 'Active call'}
                {c.offer_name ? ` · ${c.offer_name}` : ''}
              </span>
            </div>
            <span className="text-xs text-green-400 shrink-0 ml-4">
              {c.status === 'bot_joining' ? 'Bot joining…' : 'Live'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
