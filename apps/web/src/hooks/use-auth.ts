import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const { user, loading, signOut } = useAuthStore();
  return { user, loading, isAuthenticated: !!user, signOut };
}
