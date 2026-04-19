import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import type { Offer } from '@/types';

export default function NewCallPage() {
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Offer[]>('/offers')
      .then((all) => setActiveOffers(all.filter((o) => o.is_active)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="h-8 w-40 bg-[#1a1a1a] rounded animate-pulse mb-4" />
        <div className="bg-[#141414] border border-white/5 rounded-xl h-40 animate-pulse" />
      </div>
    );
  }

  if (activeOffers.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">New Call</h1>
        <div className="bg-[#141414] border border-amber-500/20 rounded-xl p-8 text-center">
          <Tag size={36} className="text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">No Active Offers</h2>
          <p className="text-gray-400 text-sm mb-5">
            You need at least one active offer to launch a call.
          </p>
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Create Offer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">New Call</h1>
      {/* Bot launch UI — wired in Module 4 */}
      <div className="bg-[#141414] border border-white/10 rounded-xl p-6 text-gray-400 text-sm">
        Bot launch coming in Module 4.
      </div>
    </div>
  );
}
