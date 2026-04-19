import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/types';

interface RoleGateProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
