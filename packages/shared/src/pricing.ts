export const PLAN_DETAILS = {
  trial: {
    name: 'Trial',
    maxSeats: 1,
    features: {
      unlimitedCalls: true,
      teamFeatures: false,
      leaderboard: false,
      teamAnalytics: false,
    },
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 47,
    annualMonthlyPrice: 39.95,
    annualTotal: 479.40,
    maxSeats: 1,
    callsPerDay: 3,
    features: {
      unlimitedCalls: false,
      teamFeatures: false,
      leaderboard: false,
      teamAnalytics: false,
    },
  },
  solo: {
    name: 'Solo',
    monthlyPrice: 147,
    annualMonthlyPrice: 124.95,
    annualTotal: 1499.4,
    maxSeats: 1,
    features: {
      unlimitedCalls: true,
      teamFeatures: false,
      leaderboard: false,
      teamAnalytics: false,
    },
  },
  team: {
    name: 'Team',
    monthlyPricePerSeat: 127,
    annualMonthlyPricePerSeat: 107.95,
    annualTotalPerSeat: 1295.4,
    minSeats: 2,
    features: {
      unlimitedCalls: true,
      teamFeatures: true,
      leaderboard: true,
      teamAnalytics: true,
    },
  },
} as const;

export type PlanKey = keyof typeof PLAN_DETAILS;

export const PLANS = {
  trial:   { name: 'Trial',   max_users: 1 as number | null, calls_per_day: null as number | null, team_features: false, base_price: 0 },
  starter: { name: 'Starter', max_users: 1 as number | null, calls_per_day: 3 as number | null,    team_features: false, monthly: 47,  annual: 479.40 },
  solo:    { name: 'Solo',    max_users: 1 as number | null, calls_per_day: null as number | null, team_features: false, monthly: 147, annual: 1499.40 },
  team:    { name: 'Team',    max_users: null as number | null, calls_per_day: null as number | null, team_features: true, monthly: 127, annual: 1295.40, min_seats: 2, per_seat: true },
} as const;

export type PlanId = 'trial' | 'starter' | 'solo' | 'team' | 'canceled';

export const PLAN_RANK: Record<PlanId, number> = {
  canceled: -1,
  trial: 0,
  starter: 1,
  solo: 2,
  team: 3,
};

export const meetsMinimumPlan = (current: PlanId, required: PlanId): boolean =>
  PLAN_RANK[current] >= PLAN_RANK[required];

export function canLaunchBot(plan: string, trialEndsAt: string | null): boolean {
  if (plan === 'canceled') return false;
  if (plan === 'trial') {
    if (!trialEndsAt) return false;
    return new Date(trialEndsAt) > new Date();
  }
  return true;
}

export function hasTeamFeatures(plan: string, trialEndsAt: string | null): boolean {
  if (plan === 'trial') {
    if (!trialEndsAt) return false;
    return new Date(trialEndsAt) > new Date();
  }
  return plan === 'team';
}
