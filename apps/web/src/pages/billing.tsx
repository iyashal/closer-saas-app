import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import RoleGate from '@/components/RoleGate';
import BillingCard from '@/components/settings/BillingCard';
import UsageCard from '@/components/settings/UsageCard';
import PlanSelector from '@/components/settings/PlanSelector';
import { usePlan } from '@/hooks/use-plan';

function BillingContent() {
  const { plan, loading, error, cancel_at_period_end, subscription_status, refresh, ...planInfo } = usePlan();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setToast('Subscription activated!');
      refresh();
      navigate('/settings/billing', { replace: true });
    } else if (checkout === 'canceled') {
      setToast('Checkout canceled.');
      navigate('/settings/billing', { replace: true });
    }
  }, [searchParams, navigate, refresh]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fullPlanInfo = { plan, cancel_at_period_end, subscription_status, ...planInfo };

  const showSelector = !plan || ['trial', 'canceled', 'starter'].includes(plan);
  const isActivePaidPlan = ['solo', 'team'].includes(plan ?? '') && subscription_status !== 'canceled';

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-white/5 rounded-xl" />
        <div className="h-48 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {toast && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-2.5 text-sm font-medium">
          {toast}
        </div>
      )}

      <BillingCard planInfo={fullPlanInfo as Parameters<typeof BillingCard>[0]['planInfo']} />

      {plan === 'starter' && (
        <UsageCard planInfo={fullPlanInfo as Parameters<typeof UsageCard>[0]['planInfo']} />
      )}

      {showSelector && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold">Choose a Plan</h3>
          <PlanSelector currentPlan={plan} />
        </div>
      )}

      {isActivePaidPlan && !cancel_at_period_end && (
        <p className="text-sm text-gray-500">
          To change your plan or manage seats, use the{' '}
          <button
            className="text-blue-400 underline hover:no-underline"
            onClick={async () => {
              const { portal_url } = await api.post<{ portal_url: string }>('/billing/portal', {});
              window.location.assign(portal_url);
            }}
          >
            billing portal
          </button>
          .
        </p>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <RoleGate roles={['owner']}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <CreditCard size={20} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Billing</h2>
            <p className="text-sm text-gray-500">Manage your subscription and payment method.</p>
          </div>
        </div>
        <BillingContent />
      </div>
    </RoleGate>
  );
}
