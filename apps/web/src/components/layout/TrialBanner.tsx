import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useTrial } from '@/hooks/use-trial';
import { useAuthStore } from '@/stores/auth-store';
import { usePlan } from '@/hooks/use-plan';

export default function TrialBanner() {
  const { isTrial, isActive, daysRemaining } = useTrial();
  const org = useAuthStore((s) => s.org);
  const { plan, isOverDailyLimit, calls_used_today, limits } = usePlan();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('trial_banner_dismissed') === '1');

  function dismiss() {
    sessionStorage.setItem('trial_banner_dismissed', '1');
    setDismissed(true);
  }

  // Past-due: non-dismissible, shown for any paid plan with past_due status
  if (org?.subscription_status === 'past_due') {
    return (
      <div className="bg-red-600/20 border-b border-red-600/30 px-4 py-1.5 text-center text-sm flex items-center justify-center gap-2">
        <span className="text-red-400">Payment failed — </span>
        <Link to="/settings/billing" className="text-red-300 underline font-medium">
          update your payment method
        </Link>
      </div>
    );
  }

  // Starter daily limit: show red bar when limit reached
  if (plan === 'starter' && isOverDailyLimit && !dismissed) {
    return (
      <div className="bg-red-600/20 border-b border-red-600/30 px-4 py-1.5 text-center text-sm flex items-center justify-center gap-2">
        <span className="text-red-400">
          Daily call limit reached ({calls_used_today}/{limits.calls_per_day}) —{' '}
        </span>
        <Link to="/settings/billing" className="text-red-300 underline font-medium">
          upgrade to Solo for unlimited calls
        </Link>
        <button onClick={dismiss} className="text-red-500 hover:text-red-300 ml-1">
          <X size={13} />
        </button>
      </div>
    );
  }

  if (!isTrial || dismissed) return null;

  const urgent = daysRemaining !== null && daysRemaining <= 2;
  const expired = !isActive;

  if (expired) {
    return (
      <div className="bg-red-600/20 border-b border-red-600/30 px-4 py-1.5 text-center text-sm flex items-center justify-center gap-2">
        <span className="text-red-400">Your trial has ended. </span>
        <Link to="/settings/billing" className="text-red-300 underline font-medium">
          Upgrade now to continue
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-4 py-1.5 text-center text-sm flex items-center justify-center gap-2 ${
        urgent
          ? 'bg-amber-600/20 border-amber-600/30'
          : 'bg-blue-600/10 border-blue-600/20'
      }`}
    >
      <span className={urgent ? 'text-amber-400' : 'text-blue-400'}>
        Trial: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left —{' '}
      </span>
      <Link
        to="/settings/billing"
        className={`underline font-medium ${urgent ? 'text-amber-300' : 'text-blue-300'}`}
      >
        Upgrade
      </Link>
      <button onClick={dismiss} className={`ml-1 ${urgent ? 'text-amber-600 hover:text-amber-400' : 'text-blue-700 hover:text-blue-400'}`}>
        <X size={13} />
      </button>
    </div>
  );
}
