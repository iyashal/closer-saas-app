import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { Framework, FrameworkCard } from '@/types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import RoleGate from '@/components/RoleGate';
import { FrameworkTabs } from '@/components/frameworks/FrameworkTabs';
import { CategorySidebar } from '@/components/frameworks/CategorySidebar';
import { FrameworkCardItem } from '@/components/frameworks/FrameworkCardItem';
import { CardFormModal } from '@/components/frameworks/CardFormModal';
import { ImportExportButtons } from '@/components/frameworks/ImportExportButtons';

type CardWithSource = FrameworkCard & { source: 'system' | 'custom' };

const ALL_CATEGORIES = [
  'price_objection',
  'spouse_objection',
  'think_about_it',
  'send_info',
  'trust_objection',
  'timing_objection',
  'competitor_objection',
  'buying_signal_next_steps',
  'buying_signal_desire',
  'coaching_talk_ratio',
  'coaching_trial_close',
] as const;

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

export default function FrameworksPage() {
  const { user } = useAuthStore();
  const defaultFramework = (user?.default_framework ?? 'nepq') as Framework;

  const [activeFramework, setActiveFramework] = useState<Framework>(defaultFramework);
  const [cards, setCards] = useState<CardWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<FrameworkCard | null>(null);

  const canEdit = user?.role === 'owner' || user?.role === 'admin';

  const fetchCards = async () => {
    setLoading(true);
    try {
      const data = await api.get<CardWithSource[]>(`/frameworks/cards?framework=${activeFramework}`);
      setCards(
        data.sort((a, b) => {
          if (a.source !== b.source) return a.source === 'custom' ? -1 : 1;
          return a.sort_order - b.sort_order;
        }),
      );
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCards();
    setSelectedCategory(null);
    setSearch('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFramework]);

  const filteredCards = useMemo(() => {
    let result = cards;
    if (selectedCategory) result = result.filter((c) => c.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.suggested_response.toLowerCase().includes(q) ||
          c.trigger_keywords.some((kw) => kw.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [cards, selectedCategory, search]);

  const categoryCounts = useMemo(() => {
    const base = search.trim()
      ? cards.filter((c) => {
          const q = search.toLowerCase();
          return (
            c.title.toLowerCase().includes(q) ||
            c.suggested_response.toLowerCase().includes(q) ||
            c.trigger_keywords.some((kw) => kw.toLowerCase().includes(q))
          );
        })
      : cards;
    return ALL_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
      acc[cat] = base.filter((c) => c.category === cat).length;
      return acc;
    }, {});
  }, [cards, search]);

  const presentCategories = ALL_CATEGORIES.filter((cat) => (categoryCounts[cat] ?? 0) > 0);

  const groupedCards = useMemo(() => {
    const groups: Record<string, CardWithSource[]> = {};
    for (const card of filteredCards) {
      if (!groups[card.category]) groups[card.category] = [];
      groups[card.category].push(card);
    }
    return groups;
  }, [filteredCards]);

  const handleSaveCard = async (formData: {
    category: string;
    title: string;
    suggested_response: string;
    framework_reference: string;
    trigger_keywords: string[];
    sort_order: number;
  }) => {
    const payload = {
      ...formData,
      framework: activeFramework,
      framework_reference: formData.framework_reference || null,
    };

    if (editingCard) {
      const updated = await api.patch<CardWithSource>(`/frameworks/cards/${editingCard.id}`, payload);
      setCards((prev) => prev.map((c) => (c.id === editingCard.id ? updated : c)));
    } else {
      const created = await api.post<CardWithSource>('/frameworks/cards', payload);
      setCards((prev) => [created, ...prev]);
    }
    setEditingCard(null);
  };

  const handleDeleteCard = async (id: string) => {
    await api.delete(`/frameworks/cards/${id}`);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const updated = await api.patch<CardWithSource>(`/frameworks/cards/${id}`, { is_active: isActive });
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const openAddModal = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const openEditModal = (card: FrameworkCard) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Frameworks</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Browse and customize the cue cards that appear during live calls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ImportExportButtons framework={activeFramework} onImported={fetchCards} />
          <RoleGate roles={['owner', 'admin']}>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              <Plus size={15} />
              Add Card
            </button>
          </RoleGate>
        </div>
      </div>

      {/* Framework tabs */}
      <FrameworkTabs
        active={activeFramework}
        defaultFramework={defaultFramework}
        onChange={setActiveFramework}
      />

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="w-full pl-9 pr-8 py-2 bg-[#141414] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Category sidebar */}
        <CategorySidebar
          categories={presentCategories}
          counts={categoryCounts}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Cards grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-[#141414] border border-white/8 rounded-xl p-4 h-40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              {search ? (
                <p>No cards match &ldquo;{search}&rdquo;</p>
              ) : selectedCategory ? (
                <p>No cards in this category.</p>
              ) : (
                <div className="space-y-2">
                  <p>No cards for this framework yet.</p>
                  {canEdit && (
                    <button
                      onClick={openAddModal}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      Add your first card
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCards).map(([category, groupCards]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="ml-2 font-normal normal-case text-gray-600">
                      {groupCards.length} card{groupCards.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupCards.map((card) => (
                      <FrameworkCardItem
                        key={card.id}
                        card={card}
                        canEdit={canEdit}
                        onEdit={openEditModal}
                        onDelete={handleDeleteCard}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card form modal */}
      {showCardModal && (
        <CardFormModal
          framework={activeFramework}
          editCard={editingCard}
          onSave={handleSaveCard}
          onClose={() => {
            setShowCardModal(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}
