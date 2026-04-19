import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Offer } from '@/types';
import RoleGate from '@/components/RoleGate';
import OfferForm, { type OfferFormData } from '@/components/offers/OfferForm';

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<Offer[]>('/offers').then((all) => {
      const found = all.find((o) => o.id === id) ?? null;
      setOffer(found);
      setLoading(false);
    });
  }, [id]);

  async function handleEdit(data: OfferFormData) {
    if (!offer) return;
    const updated = await api.patch<Offer>(`/offers/${offer.id}`, data);
    setOffer(updated);
    setEditing(false);
  }

  async function handleToggleActive() {
    if (!offer) return;
    if (offer.is_active) {
      setDeactivateModal(true);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<Offer>(`/offers/${offer.id}`, { is_active: true });
      setOffer(updated);
    } catch {
      setError('Failed to update offer');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!offer) return;
    setSaving(true);
    try {
      const updated = await api.patch<Offer>(`/offers/${offer.id}`, { is_active: false });
      setOffer(updated);
      setDeactivateModal(false);
    } catch {
      setError('Failed to deactivate offer');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-8 w-32 bg-[#1a1a1a] rounded animate-pulse mb-6" />
        <div className="bg-[#141414] border border-white/5 rounded-xl h-64 animate-pulse" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20">
        <p className="text-gray-400">Offer not found.</p>
        <button onClick={() => navigate('/offers')} className="mt-4 text-blue-400 text-sm hover:underline">
          Back to Offers
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/offers')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Offers
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {editing ? (
        <div className="bg-[#141414] border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Edit Offer</h2>
          <OfferForm
            initial={offer}
            mode="edit"
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/10 rounded-xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{offer.name}</h1>
                {!offer.is_active && (
                  <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
              <p className="text-2xl text-green-400 font-semibold mt-1">${offer.price.toLocaleString()}</p>
            </div>

            <RoleGate roles={['owner', 'admin']}>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 disabled:opacity-50"
                >
                  {offer.is_active ? (
                    <>
                      <ToggleRight size={18} className="text-blue-400" />
                      Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={18} />
                      Inactive
                    </>
                  )}
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>
            </RoleGate>
          </div>

          {offer.guarantee && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Guarantee</h3>
              <p className="text-gray-300 text-sm">{offer.guarantee}</p>
            </div>
          )}

          {offer.description && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{offer.description}</p>
            </div>
          )}

          {offer.common_objections.length > 0 && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Common Objections</h3>
              <div className="flex flex-wrap gap-2">
                {offer.common_objections.map((obj) => (
                  <span
                    key={obj}
                    className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full"
                  >
                    {obj}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600 pt-2 border-t border-white/5">
            Created {new Date(offer.created_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {deactivateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <h3 className="text-lg font-semibold text-white">Deactivate Offer</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Deactivating this offer will hide it from new call launches. Past calls using this offer remain unchanged.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeactivate}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Deactivating…' : 'Deactivate'}
              </button>
              <button
                onClick={() => setDeactivateModal(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
