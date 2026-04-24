import { create } from 'zustand';

interface PaywallState {
  isOpen: boolean;
  reason: 'plan_required' | 'daily_limit_reached' | null;
  requiredPlan: string | null;
  open: (reason: 'plan_required' | 'daily_limit_reached', requiredPlan?: string) => void;
  close: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  reason: null,
  requiredPlan: null,
  open: (reason, requiredPlan) => set({ isOpen: true, reason, requiredPlan: requiredPlan ?? null }),
  close: () => set({ isOpen: false, reason: null, requiredPlan: null }),
}));
