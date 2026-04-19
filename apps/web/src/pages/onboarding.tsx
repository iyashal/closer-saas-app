import { useState, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, org, setOrg } = useAuthStore();

  const [orgName, setOrgName] = useState(org?.name ?? '');
  const [offerName, setOfferName] = useState('');
  const [price, setPrice] = useState('');
  const [guarantee, setGuarantee] = useState('');
  const [description, setDescription] = useState('');
  const [objections, setObjections] = useState<string[]>([]);
  const [objectionInput, setObjectionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'org' | 'offer'>('org');

  function addObjection() {
    const val = objectionInput.trim();
    if (val && !objections.includes(val)) {
      setObjections((prev) => [...prev, val]);
    }
    setObjectionInput('');
  }

  function handleObjectionKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addObjection(); }
  }

  async function handleOrgNext(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<{ id: string; name: string }>('/org', { name: orgName.trim() });
      if (org) setOrg({ ...org, ...updated });
      setStep('offer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleOfferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!offerName.trim() || !price) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/offers', {
        name: offerName.trim(),
        price: parseFloat(price),
        guarantee: guarantee.trim() || null,
        description: description.trim() || null,
        common_objections: objections,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  }

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-white mb-1">
            Welcome{firstName ? `, ${firstName}` : ''}!
          </div>
          <p className="text-gray-500 text-sm">Let's set up your workspace in 2 quick steps.</p>
        </div>

        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
            step === 'org' ? 'bg-blue-600 text-white' : 'bg-green-600/30 text-green-400'
          }`}>1</div>
          <div className={`h-px w-12 ${step === 'offer' ? 'bg-blue-500' : 'bg-white/10'}`} />
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
            step === 'offer' ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-500'
          }`}>2</div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-xl p-8">
          {step === 'org' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Name your workspace</h2>
              <p className="text-sm text-gray-500 mb-6">This is what your team sees — you can change it later.</p>
              <form onSubmit={handleOrgNext} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Workspace name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Closing Team"
                    required
                    autoFocus
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={saving || !orgName.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving…' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {step === 'offer' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Create your first offer</h2>
              <p className="text-sm text-gray-500 mb-6">The AI uses this to detect objections and coach you in real time.</p>
              <form onSubmit={handleOfferSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Offer name</label>
                  <input
                    type="text"
                    value={offerName}
                    onChange={(e) => setOfferName(e.target.value)}
                    placeholder="12-Week Coaching Program"
                    required
                    autoFocus
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Price (USD)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="3000"
                    required
                    min="1"
                    step="0.01"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Guarantee <span className="text-gray-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={guarantee}
                    onChange={(e) => setGuarantee(e.target.value)}
                    placeholder="30-day money-back guarantee"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Description <span className="text-gray-600">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does the offer include? What pain does it solve?"
                    rows={3}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Common objections <span className="text-gray-600">(type and press Enter)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {objections.map((obj) => (
                      <span
                        key={obj}
                        className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-gray-300"
                      >
                        {obj}
                        <button
                          type="button"
                          onClick={() => setObjections((prev) => prev.filter((o) => o !== obj))}
                          className="text-gray-500 hover:text-white transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={objectionInput}
                    onChange={(e) => setObjectionInput(e.target.value)}
                    onKeyDown={handleObjectionKey}
                    onBlur={addObjection}
                    placeholder="e.g. It's too expensive"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={saving || !offerName.trim() || !price}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving…' : 'Go to dashboard'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
