import { useNavigate } from 'react-router-dom';
import { Lock, TrendingUp } from 'lucide-react';
import { usePaywallStore } from '@/stores/paywall-store';

export default function PaywallModal() {
  const { isOpen, reason, requiredPlan, close } = usePaywallStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const isDailyLimit = reason === 'daily_limit_reached';

  function handleUpgrade() {
    close();
    navigate('/settings/billing');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDailyLimit ? 'bg-amber-500/20' : 'bg-blue-600/20'}`}>
            {isDailyLimit ? (
              <TrendingUp size={22} className="text-amber-400" />
            ) : (
              <Lock size={22} className="text-blue-400" />
            )}
          </div>

          <div>
            <h2 className="text-white font-semibold text-lg">
              {isDailyLimit ? 'Daily Limit Reached' : 'Upgrade Required'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isDailyLimit
                ? "You've hit your Starter daily limit of 3 calls. Upgrade to Solo for unlimited calls."
                : `This feature requires the${requiredPlan ? ` ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}` : ''} plan.`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleUpgrade}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {isDailyLimit ? 'Upgrade to Solo' : 'View Plans'}
          </button>
          <button
            onClick={close}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
