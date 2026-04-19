import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Tag, Video, User, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useTrial } from '@/hooks/use-trial';
import type { Call, Offer } from '@/types';

const VALID_MEETING_PATTERN = /^https:\/\/([\w-]+\.)?zoom\.us\/|^https:\/\/meet\.google\.com\//;

function isValidMeetingUrl(url: string): boolean {
  return VALID_MEETING_PATTERN.test(url);
}

export default function NewCallPage() {
  const navigate = useNavigate();
  const { isExpired } = useTrial();

  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  const [offerId, setOfferId] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [urlError, setUrlError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    api
      .get<Offer[]>('/offers')
      .then((all) => {
        const active = all.filter((o) => o.is_active);
        setActiveOffers(active);
        if (active.length > 0) setOfferId(active[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingOffers(false));
  }, []);

  function handleUrlChange(val: string) {
    setMeetingUrl(val);
    if (val && !isValidMeetingUrl(val)) {
      setUrlError('Must be a Zoom or Google Meet link');
    } else {
      setUrlError('');
    }
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!offerId || !meetingUrl || urlError) return;

    setSubmitError('');
    setLaunching(true);

    try {
      const call = await api.post<Call>('/calls/launch', {
        offer_id: offerId,
        meeting_url: meetingUrl,
        prospect_name: prospectName.trim() || undefined,
      });
      navigate(`/call/${call.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to launch bot');
      setLaunching(false);
    }
  }

  if (loadingOffers) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="h-8 w-40 bg-[#1a1a1a] rounded animate-pulse mb-4" />
        <div className="bg-[#141414] border border-white/5 rounded-xl h-64 animate-pulse" />
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">New Call</h1>
        <div className="bg-[#141414] border border-red-500/20 rounded-xl p-8 text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Trial Expired</h2>
          <p className="text-gray-400 text-sm mb-5">
            Upgrade your plan to continue launching AI coaching bots.
          </p>
          <Link
            to="/settings/billing"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            View plans &amp; upgrade
          </Link>
        </div>
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

  const canSubmit = Boolean(offerId && meetingUrl && !urlError && !launching);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">New Call</h1>
      <p className="text-sm text-gray-500 mb-6">
        Paste your meeting link and we'll join as a silent coaching bot.
      </p>

      <form onSubmit={handleLaunch} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Offer</label>
          <select
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          >
            {activeOffers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — ${o.price.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Meeting Link</label>
          <div className="relative">
            <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className={`w-full bg-[#1a1a1a] border ${
                urlError ? 'border-red-500' : 'border-white/10'
              } text-white rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors`}
            />
          </div>
          {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
          <p className="text-xs text-gray-600 mt-1">Zoom and Google Meet supported</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Prospect Name <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="e.g. John Smith"
              maxLength={120}
              className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{submitError}</p>
          </div>
        )}

        <div className="bg-[#1a1a1a] border border-white/5 rounded-lg px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
          <ExternalLink size={14} className="mt-0.5 shrink-0" />
          <span>
            The bot will join your meeting as a silent note-taker. Admit it from the waiting room if
            required by your meeting settings.
          </span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg text-sm transition-colors"
        >
          {launching ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Launching bot…
            </>
          ) : (
            'Launch Bot'
          )}
        </button>
      </form>
    </div>
  );
}
