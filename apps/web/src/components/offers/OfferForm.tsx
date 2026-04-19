import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import type { Offer } from '@/types';

interface OfferFormProps {
  initial?: Partial<Offer>;
  mode: 'create' | 'edit';
  onSubmit: (data: OfferFormData) => Promise<void>;
  onCancel: () => void;
}

export interface OfferFormData {
  name: string;
  price: number;
  guarantee: string;
  description: string;
  common_objections: string[];
}

export default function OfferForm({ initial, mode, onSubmit, onCancel }: OfferFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [guarantee, setGuarantee] = useState(initial?.guarantee ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [objections, setObjections] = useState<string[]>(initial?.common_objections ?? []);
  const [objectionInput, setObjectionInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function addObjection() {
    const trimmed = objectionInput.trim();
    if (trimmed && !objections.includes(trimmed)) {
      setObjections((prev) => [...prev, trimmed]);
    }
    setObjectionInput('');
  }

  function handleObjectionKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addObjection();
    }
  }

  function removeObjection(tag: string) {
    setObjections((prev) => prev.filter((o) => o !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) newErrors.price = 'Price must be greater than 0';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        price: parsedPrice,
        guarantee: guarantee.trim(),
        description: description.trim(),
        common_objections: objections,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors';
  const labelClass = 'block text-sm text-gray-400 mb-1';
  const errorClass = 'text-xs text-red-400 mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Offer Name *</label>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 6-Month Business Coaching"
          maxLength={120}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}
      </div>

      <div>
        <label className={labelClass}>Price *</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            className={`${inputClass} pl-7`}
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="5000"
          />
        </div>
        {errors.price && <p className={errorClass}>{errors.price}</p>}
      </div>

      <div>
        <label className={labelClass}>Guarantee</label>
        <input
          className={inputClass}
          value={guarantee}
          onChange={(e) => setGuarantee(e.target.value)}
          placeholder="e.g. 30-day money-back guarantee"
          maxLength={300}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${inputClass} resize-none h-24`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what's included..."
          maxLength={2000}
        />
      </div>

      <div>
        <label className={labelClass}>Common Objections</label>
        <p className="text-xs text-gray-500 mb-2">Type an objection and press Enter to add it</p>
        <input
          className={inputClass}
          value={objectionInput}
          onChange={(e) => setObjectionInput(e.target.value)}
          onKeyDown={handleObjectionKey}
          onBlur={addObjection}
          placeholder="e.g. It's too expensive"
        />
        {objections.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {objections.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-2 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeObjection(tag)}
                  className="hover:text-white transition-colors"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {submitting ? 'Saving…' : mode === 'create' ? 'Create Offer' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
