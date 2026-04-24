import { useState } from 'react';
import { Check, Users } from 'lucide-react';
import { api } from '@/lib/api';

interface PlanSelectorProps {
  currentPlan?: string | null;
}

const PLAN_FEATURES = {
  starter: ['1 user', '3 calls/day', 'Live cue cards', 'Post-call AI summary', 'Deal health score'],
  solo: ['1 user', 'Unlimited calls', 'Live cue cards', 'Post-call AI summary', 'Deal health score', 'Follow-up email draft'],
  team: ['2+ closers', 'Unlimited calls', 'All Solo features', 'Team leaderboard', 'Team analytics', 'Org management'],
};

export default function PlanSelector({ currentPlan }: PlanSelectorProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [seats, setSeats] = useState(2);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleChoosePlan(plan: 'starter' | 'solo' | 'team') {
    setLoadingPlan(plan);
    try {
      const { checkout_url } = await api.post<{ checkout_url: string }>('/billing/checkout', {
        plan,
        interval,
        ...(plan === 'team' ? { seats } : {}),
      });
      window.location.assign(checkout_url);
    } catch {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const plans: { id: 'starter' | 'solo' | 'team'; monthly: number; annual: number; perSeat?: boolean }[] = [
    { id: 'starter', monthly: 47, annual: 39.95 },
    { id: 'solo', monthly: 147, annual: 124.95 },
    { id: 'team', monthly: 127, annual: 107.95, perSeat: true },
  ];

  return (
    <div className="space-y-4">
      {/* Monthly / Annual toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setInterval('month')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${interval === 'month' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval('year')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${interval === 'year' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          Annual
          <span className={`text-xs px-1.5 py-0.5 rounded ${interval === 'year' ? 'bg-white/20' : 'bg-green-500/20 text-green-400'}`}>
            Save 15%
          </span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const price = interval === 'year' ? p.annual : p.monthly;
          const isCurrent = currentPlan === p.id;
          const isPopular = p.id === 'solo';
          const features = PLAN_FEATURES[p.id];

          return (
            <div
              key={p.id}
              className={`relative bg-[#141414] border rounded-xl p-5 flex flex-col gap-4 transition-colors ${
                isPopular ? 'border-blue-500/50' : 'border-white/5'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-white font-semibold capitalize">{p.id}</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">${price}</span>
                  <span className="text-gray-500 text-sm">
                    /mo{p.perSeat ? '/seat' : ''}
                  </span>
                </div>
                {interval === 'year' && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    billed ${(price * 12).toFixed(2)}/yr{p.perSeat ? ' per seat' : ''}
                  </p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={13} className="text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {p.id === 'team' && (
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-500" />
                  <label className="text-xs text-gray-500">Seats</label>
                  <input
                    type="number"
                    min={2}
                    value={seats}
                    onChange={(e) => setSeats(Math.max(2, parseInt(e.target.value, 10) || 2))}
                    className="w-16 bg-white/5 border border-white/10 text-white text-sm rounded px-2 py-1 text-center"
                  />
                </div>
              )}

              {isCurrent ? (
                <div className="text-center text-sm text-gray-500 py-2 border border-white/10 rounded-lg">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleChoosePlan(p.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isPopular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                  }`}
                >
                  {loadingPlan === p.id ? 'Loading…' : 'Choose Plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
