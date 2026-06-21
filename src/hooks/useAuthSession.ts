import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { mapSessionUser } from '@/lib/auth';
import { useStore } from '@/store/useStore';

// ── Auth session bridge ──────────────────────────────────────────────
// Resolve the current Supabase session on boot and keep the store's
// currentUser in sync with sign-in / sign-out across tabs.
export function useAuthSession() {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setAuthReady = useStore((s) => s.setAuthReady);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session ? mapSessionUser(data.session.user) : null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session ? mapSessionUser(session.user) : null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [setCurrentUser, setAuthReady]);
}
