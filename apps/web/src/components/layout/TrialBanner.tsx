import { Link } from 'react-router-dom';
import { useTrial } from '@/hooks/use-trial';

export default function TrialBanner() {
  const { isTrial, isActive, daysRemaining } = useTrial();

  if (!isTrial) return null;

  const urgent = daysRemaining !== null && daysRemaining <= 3;
  const expired = !isActive;

  if (expired) {
    return (
      <div className="bg-red-600/20 border-b border-red-600/30 px-4 py-1.5 text-center text-sm">
        <span className="text-red-400">Your trial has ended. </span>
        <Link to="/settings/billing" className="text-red-300 underline font-medium">
          Upgrade now to continue
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`border-b px-4 py-1.5 text-center text-sm ${
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
    </div>
  );
}
