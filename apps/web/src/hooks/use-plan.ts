import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface PlanInfo {
  plan: string;
  billing_interval: 'month' | 'year' | null;
  subscription_status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  max_seats: number;
  limits: {
    calls_per_day: number | null;
    max_users: number | null;
    team_features: boolean;
  };
  is_trialing: boolean;
  days_left_in_trial: number | null;
  calls_used_today: number | null;
}

export function usePlan() {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const data = await api.get<PlanInfo>('/billing/plan');
      setPlanInfo(data);
      setError(null);
    } catch {
      setError('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
    const interval = setInterval(fetchPlan, 60_000);
    const onFocus = () => { fetchPlan(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchPlan]);

  const callsPerDay = planInfo?.limits?.calls_per_day ?? null;
  const callsUsedToday = planInfo?.calls_used_today ?? null;

  return {
    plan: planInfo?.plan ?? null,
    billing_interval: planInfo?.billing_interval ?? null,
    subscription_status: planInfo?.subscription_status ?? null,
    current_period_end: planInfo?.current_period_end ?? null,
    trial_ends_at: planInfo?.trial_ends_at ?? null,
    cancel_at_period_end: planInfo?.cancel_at_period_end ?? false,
    max_seats: planInfo?.max_seats ?? 1,
    limits: planInfo?.limits ?? { calls_per_day: null, max_users: 1, team_features: false },
    is_trialing: planInfo?.is_trialing ?? false,
    days_left_in_trial: planInfo?.days_left_in_trial ?? null,
    calls_used_today: callsUsedToday,
    isOverDailyLimit: callsPerDay !== null && callsUsedToday !== null && callsUsedToday >= callsPerDay,
    canUseTeamFeatures: planInfo?.limits?.team_features ?? false,
    loading,
    error,
    refresh: fetchPlan,
  };
}
