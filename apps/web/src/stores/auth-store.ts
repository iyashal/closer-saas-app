import { create } from 'zustand';
import type { User, Organization } from '@/types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  org: Organization | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setOrg: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  loading: true,
  setUser: (user) => set({ user }),
  setOrg: (org) => set({ org }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, org: null });
  },
}));
