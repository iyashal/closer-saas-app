import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { Framework, FrameworkCard } from '@/types';

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

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

interface FormState {
  category: string;
  title: string;
  suggested_response: string;
  framework_reference: string;
  trigger_keywords: string[];
  sort_order: number;
}

interface Props {
  framework: Framework;
  editCard?: FrameworkCard | null;
  onSave: (data: FormState) => Promise<void>;
  onClose: () => void;
}

export function CardFormModal({ framework, editCard, onSave, onClose }: Props) {
  const [form, setForm] = useState<FormState>({
    category: ALL_CATEGORIES[0],
    title: '',
    suggested_response: '',
    framework_reference: '',
    trigger_keywords: [],
    sort_order: 0,
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editCard) {
      setForm({
        category: editCard.category,
        title: editCard.title,
        suggested_response: editCard.suggested_response,
        framework_reference: editCard.framework_reference ?? '',
        trigger_keywords: editCard.trigger_keywords ?? [],
        sort_order: editCard.sort_order,
      });
    }
  }, [editCard]);

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !form.trigger_keywords.includes(kw)) {
      setForm((f) => ({ ...f, trigger_keywords: [...f.trigger_keywords, kw] }));
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setForm((f) => ({ ...f, trigger_keywords: f.trigger_keywords.filter((k) => k !== kw) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.suggested_response.trim()) {
      setError('Title and suggested response are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const FRAMEWORK_LABELS: Record<string, string> = {
    nepq: 'NEPQ',
    straight_line: 'Straight Line',
    unicorn_closer: 'Unicorn Closer',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-white font-semibold">
            {editCard ? 'Edit Card' : 'Add Custom Card'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Framework (disabled) */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Framework</label>
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-sm">
              {FRAMEWORK_LABELS[framework] ?? framework}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {ALL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Isolate the Real Concern"
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Suggested response */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Suggested Response *{' '}
              <span className="text-gray-600 font-normal">(what the closer reads aloud)</span>
            </label>
            <textarea
              value={form.suggested_response}
              onChange={(e) => setForm((f) => ({ ...f, suggested_response: e.target.value }))}
              placeholder="The script the closer will say..."
              rows={4}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Framework reference */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Framework Reference{' '}
              <span className="text-gray-600 font-normal">(optional, e.g. "The Doctor Frame")</span>
            </label>
            <input
              type="text"
              value={form.framework_reference}
              onChange={(e) => setForm((f) => ({ ...f, framework_reference: e.target.value }))}
              placeholder="e.g. NEPQ — Consequence Question"
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Trigger keywords */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Trigger Keywords{' '}
              <span className="text-gray-600 font-normal">(optional — helps AI match this card)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Type keyword and press Enter"
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            {form.trigger_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.trigger_keywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    {kw}
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Sort Order{' '}
              <span className="text-gray-600 font-normal">(optional, lower = shown first)</span>
            </label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              className="w-32 px-3 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-400 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : editCard ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
