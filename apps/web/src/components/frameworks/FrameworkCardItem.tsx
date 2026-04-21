import { useState } from 'react';
import { Pencil, Trash2, Lock, Eye } from 'lucide-react';
import type { FrameworkCard } from '@/types';
import { CueCard, type ActiveCueCard } from '@/components/call/CueCard';

interface Props {
  card: FrameworkCard & { source: 'system' | 'custom' };
  canEdit: boolean;
  onEdit: (card: FrameworkCard) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function FrameworkCardItem({ card, canEdit, onEdit, onDelete, onToggleActive }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const previewCard: ActiveCueCard = {
    shownId: card.id,
    card,
    triggerText: card.trigger_keywords.length > 0 ? card.trigger_keywords[0] : null,
    confidence: 0.95,
    shownAt: Date.now(),
  };

  return (
    <div className="bg-[#141414] border border-white/8 rounded-xl p-4 space-y-3 relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              card.source === 'system'
                ? 'bg-gray-500/20 text-gray-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {card.source === 'system' ? 'System' : 'Custom'}
          </span>
          {!card.is_active && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber-500/20 text-amber-400">
              Inactive
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowPreview(true)}
            className="p-1.5 text-gray-600 hover:text-gray-300 transition-colors"
            title="Preview card"
          >
            <Eye size={14} />
          </button>

          {card.source === 'system' ? (
            <Lock size={13} className="text-gray-700 ml-1" aria-label="System default — read-only" />
          ) : canEdit ? (
            <>
              <button
                onClick={() => onEdit(card)}
                className="p-1.5 text-gray-600 hover:text-blue-400 transition-colors"
                title="Edit card"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                title="Delete card"
              >
                <Trash2 size={13} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-white leading-snug">{card.title}</p>

      {/* Suggested response */}
      <p className="text-sm text-gray-300 leading-relaxed">{card.suggested_response}</p>

      {/* Framework reference */}
      {card.framework_reference && (
        <p className="text-xs text-gray-600 italic">{card.framework_reference}</p>
      )}

      {/* Keywords */}
      {card.trigger_keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {card.trigger_keywords.slice(0, 5).map((kw) => (
            <span key={kw} className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded">
              {kw}
            </span>
          ))}
          {card.trigger_keywords.length > 5 && (
            <span className="text-[10px] text-gray-600">+{card.trigger_keywords.length - 5} more</span>
          )}
        </div>
      )}

      {/* Active toggle for custom cards */}
      {card.source === 'custom' && canEdit && (
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <span className="text-xs text-gray-500">Active</span>
          <button
            onClick={() => onToggleActive(card.id, !card.is_active)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              card.is_active ? 'bg-blue-600' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                card.is_active ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      )}

      {/* Preview overlay */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowPreview(false)}
        >
          <div className="w-80" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-gray-500 text-center mb-2">Preview — how it looks during a live call</p>
            <CueCard
              cueCard={previewCard}
              isTop={true}
              onDismiss={() => setShowPreview(false)}
              onUsed={() => setShowPreview(false)}
            />
            <p className="text-xs text-gray-600 text-center mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-white font-semibold">Delete this card?</h3>
              <p className="text-gray-400 text-sm mt-1">This cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(card.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
