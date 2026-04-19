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
