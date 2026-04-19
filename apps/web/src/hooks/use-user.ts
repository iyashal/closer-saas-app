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
        const userRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userRes.ok) {
          if (mounted) { setUser(null); setOrg(null); setLoading(false); }
          return;
        }

        const dbUser: User = await userRes.json() as User;

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
