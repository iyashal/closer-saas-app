import { useAuthStore } from '@/stores/auth-store';

export function useTrial() {
  const org = useAuthStore((s) => s.org);

  if (!org || org.plan !== 'trial' || !org.trial_ends_at) {
    const isActivePaidPlan = org?.plan === 'solo' || org?.plan === 'team';
    return {
      isActive: isActivePaidPlan,
      isExpired: org?.plan === 'canceled' || (!isActivePaidPlan && !!org),
      daysRemaining: null,
      trialEndsAt: null,
      isTrial: false,
    };
  }

  const now = Date.now();
  const endsAt = new Date(org.trial_ends_at).getTime();
  const msRemaining = endsAt - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isActive = msRemaining > 0;

  return {
    isActive,
    isExpired: !isActive,
    daysRemaining,
    trialEndsAt: org.trial_ends_at,
    isTrial: true,
  };
}
