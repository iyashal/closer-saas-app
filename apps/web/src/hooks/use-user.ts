import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { User, Organization } from '@/types';

export function useUser() {
  const { user, org, loading, setUser, setOrg, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function loadUser(accessToken: string) {
      try {
        const authHeader = { Authorization: `Bearer ${accessToken}` };

        const userRes = await fetch('/api/auth/me', { headers: authHeader });

        if (!userRes.ok) {
          if (mounted) { setUser(null); setOrg(null); setLoading(false); }
          return;
        }

        let dbUser: User = await userRes.json() as User;

        // Supabase auth.users exists but complete-signup was never called
        // (happens when email confirmation is required and user logs in via /login).
        // Auto-complete the signup so the rest of the app has a valid user row.
        if (!dbUser.org_id) {
          const fallbackName = (dbUser.email as string)?.split('@')[0] ?? 'User';
          const signupRes = await fetch('/api/auth/complete-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ full_name: fallbackName }),
          });
          if (!signupRes.ok) {
            if (mounted) { setUser(null); setOrg(null); setLoading(false); }
            return;
          }
          const retryRes = await fetch('/api/auth/me', { headers: authHeader });
          if (!retryRes.ok) {
            if (mounted) { setUser(null); setOrg(null); setLoading(false); }
            return;
          }
          dbUser = await retryRes.json() as User;
        }

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', dbUser.org_id)
          .single();

        if (mounted) {
          setUser(dbUser);
          setOrg(orgData as Organization | null);
          setLoading(false);
        }
      } catch {
        if (mounted) { setUser(null); setOrg(null); setLoading(false); }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        loadUser(data.session.access_token);
      } else {
        setUser(null);
        setOrg(null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        loadUser(session.access_token);
      } else {
        setUser(null);
        setOrg(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, org, loading };
}
