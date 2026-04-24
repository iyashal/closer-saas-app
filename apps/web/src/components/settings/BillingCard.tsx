import { useState } from 'react';
import { CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanInfo } from '@/hooks/use-plan';

interface BillingCardProps {
  planInfo: PlanInfo;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BillingCard({ planInfo }: BillingCardProps) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const { portal_url } = await api.post<{ portal_url: string }>('/billing/portal', {});
      window.location.assign(portal_url);
    } catch {
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const planLabel = planInfo.plan
    ? planInfo.plan.charAt(0).toUpperCase() + planInfo.plan.slice(1)
    : 'Trial';

  const statusBadge = (): { label: string; cls: string } => {
    if (planInfo.subscription_status === 'past_due') return { label: 'Past Due', cls: 'bg-red-500/20 text-red-400' };
    if (planInfo.subscription_status === 'canceled') return { label: 'Canceled', cls: 'bg-gray-500/20 text-gray-400' };
    if (planInfo.is_trialing) return { label: 'Trial', cls: 'bg-blue-500/20 text-blue-400' };
    if (planInfo.subscription_status === 'active') return { label: 'Active', cls: 'bg-green-500/20 text-green-400' };
    return { label: planLabel, cls: 'bg-blue-500/20 text-blue-400' };
  };

  const badge = statusBadge();

  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <CreditCard size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-lg">{planLabel} Plan</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
            </div>
            {planInfo.billing_interval && (
              <p className="text-sm text-gray-500 capitalize">{planInfo.billing_interval}ly billing</p>
            )}
          </div>
        </div>

        <button
          onClick={openPortal}
          disabled={loading}
          className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Manage Billing'}
        </button>
      </div>

      {planInfo.is_trialing && planInfo.days_left_in_trial !== null && (
        <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          <Calendar size={14} />
          Trial ends in {planInfo.days_left_in_trial} day{planInfo.days_left_in_trial !== 1 ? 's' : ''}
        </div>
      )}

      {planInfo.subscription_status === 'past_due' && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          Payment failed — update your payment method to avoid interruption
        </div>
      )}

      {!planInfo.is_trialing && planInfo.current_period_end && !planInfo.cancel_at_period_end && (
        <p className="text-sm text-gray-500">
          Renews on {formatDate(planInfo.current_period_end)}
        </p>
      )}

      {planInfo.cancel_at_period_end && planInfo.current_period_end && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <span className="text-sm text-amber-400">
            Cancels on {formatDate(planInfo.current_period_end)}
          </span>
          <button
            onClick={openPortal}
            className="text-xs text-amber-300 underline hover:no-underline"
          >
            Resume
          </button>
        </div>
      )}
    </div>
  );
}
