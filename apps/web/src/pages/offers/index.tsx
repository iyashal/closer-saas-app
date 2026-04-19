import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Offer } from '@/types';
import RoleGate from '@/components/RoleGate';
import OfferForm, { type OfferFormData } from '@/components/offers/OfferForm';

type Filter = 'active' | 'inactive' | 'all';

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  async function loadOffers() {
    try {
      const data = await api.get<Offer[]>('/offers');
      setOffers(data);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOffers(); }, []);

  const filtered = offers.filter((o) => {
    if (filter === 'active') return o.is_active;
    if (filter === 'inactive') return !o.is_active;
    return true;
  });

  async function handleCreate(data: OfferFormData) {
    await api.post('/offers', data);
    setShowCreate(false);
    loadOffers();
  }

  async function toggleActive(offer: Offer) {
    await api.patch(`/offers/${offer.id}`, { is_active: !offer.is_active });
    setOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, is_active: !o.is_active } : o)));
  }

  const filterBtn = (f: Filter, label: string) => (
    <button
      onClick={() => setFilter(f)}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
        filter === f
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Offers</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage the offers you sell on calls</p>
        </div>
        <RoleGate roles={['owner', 'admin']}>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            Create Offer
          </button>
        </RoleGate>
      </div>

      {showCreate && (
        <div className="bg-[#141414] border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">New Offer</h2>
          <OfferForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      <div className="flex gap-1 mb-4">
        {filterBtn('active', 'Active')}
        {filterBtn('inactive', 'Inactive')}
        {filterBtn('all', 'All')}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#141414] border border-white/5 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {offers.length === 0 ? (
            <div>
              <p className="text-lg mb-2">No offers yet</p>
              <p className="text-sm mb-4">Create your first offer to start launching calls.</p>
              <RoleGate roles={['owner', 'admin']}>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Create Offer
                </button>
              </RoleGate>
            </div>
          ) : (
            <p>No {filter} offers found.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((offer) => (
            <div
              key={offer.id}
              className="bg-[#141414] border border-white/5 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/offers/${offer.id}`)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{offer.name}</span>
                  {!offer.is_active && (
                    <span className="shrink-0 text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-400">
                  <span className="text-green-400 font-medium">${offer.price.toLocaleString()}</span>
                  {offer.guarantee && (
                    <span className="truncate max-w-xs">· {offer.guarantee}</span>
                  )}
                </div>
              </div>

              <RoleGate roles={['owner', 'admin']}>
                <button
                  onClick={() => toggleActive(offer)}
                  className="shrink-0 text-gray-400 hover:text-white transition-colors"
                  title={offer.is_active ? 'Deactivate' : 'Activate'}
                >
                  {offer.is_active ? (
                    <ToggleRight size={22} className="text-blue-400" />
                  ) : (
                    <ToggleLeft size={22} />
                  )}
                </button>
              </RoleGate>

              <button
                onClick={() => navigate(`/offers/${offer.id}`)}
                className="shrink-0 text-gray-600 hover:text-gray-400 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
