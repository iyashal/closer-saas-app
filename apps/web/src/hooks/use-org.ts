import { useAuthStore } from '@/stores/auth-store';

export function useOrg() {
  const user = useAuthStore((s) => s.user);
  const org = useAuthStore((s) => s.org);
  return {
    org,
    orgId: user?.org_id ?? null,
    role: user?.role ?? null,
    isOwner: user?.role === 'owner',
    isAdmin: user?.role === 'admin' || user?.role === 'owner',
    isCloser: user?.role === 'closer',
    plan: org?.plan ?? null,
    isTeamPlan: org?.plan === 'team',
  };
}
