import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '@/hooks/use-user';
import { useAuthStore } from '@/stores/auth-store';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';

import LoginPage from '@/pages/login';
import SignupPage from '@/pages/signup';
import OnboardingPage from '@/pages/onboarding';
import AcceptInvitePage from '@/pages/accept-invite';
import DashboardPage from '@/pages/dashboard';
import SettingsPage from '@/pages/settings';
import CallHistoryPage from '@/pages/call-history';
import FrameworksPage from '@/pages/frameworks';
import AnalyticsPage from '@/pages/analytics';
import TeamPage from '@/pages/team';
import NewCallPage from '@/pages/new-call';
import OffersPage from '@/pages/offers/index';
import OfferDetailPage from '@/pages/offers/[id]';

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <>{children}</>;
}

function TrialExpiredGuard({ children }: { children: React.ReactNode }) {
  const org = useAuthStore((s) => s.org);
  if (org?.plan === 'trial' && org.trial_ends_at) {
    const expired = new Date(org.trial_ends_at).getTime() < Date.now();
    if (expired) return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useUser();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <OnboardingPage />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/call/new"
        element={
          <ProtectedRoute>
            <TrialExpiredGuard>
              <AppShell>
                <NewCallPage />
              </AppShell>
            </TrialExpiredGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calls"
        element={
          <ProtectedRoute>
            <AppShell>
              <CallHistoryPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/frameworks"
        element={
          <ProtectedRoute>
            <AppShell>
              <FrameworksPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/offers"
        element={
          <ProtectedRoute>
            <AppShell>
              <OffersPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/offers/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <OfferDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AppShell>
              <AnalyticsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <AppShell>
              <TeamPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
