import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, hasSupabaseConfig } from '../lib/supabase';
import { destroyAppSession } from '../lib/appSession';

/** @typedef {import('@supabase/supabase-js').User} SupabaseUser */
/** @typedef {import('@supabase/supabase-js').Session} SupabaseSession */

/**
 * @typedef {Object} AuthContextValue
 * @property {SupabaseUser | null} user
 * @property {string | null} role
 * @property {SupabaseSession | null} session
 * @property {boolean} loading
 * @property {() => Promise<void>} signOut
 */

/** @type {import('react').Context<AuthContextValue>} */
const AuthContext = createContext({
  user: null,
  role: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(/** @type {SupabaseUser | null} */ (null));
  const [role, setRole] = useState(/** @type {string | null} */ (null));
  const [session, setSession] = useState(/** @type {SupabaseSession | null} */ (null));
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    async function fetchUserRole(userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setRole(data.role);
        } else {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          setRole(currentUser?.user_metadata?.role ?? null);
        }
      } catch (err) {
        console.error('Error fetching role:', err);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setRole(currentUser?.user_metadata?.role ?? null);
      } finally {
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      const initialUser = initialSession?.user ?? null;
      setSession(initialSession);
      setUser(initialUser);
      userIdRef.current = initialUser?.id ?? null;

      if (initialUser) {
        fetchUserRole(initialUser.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUser = nextSession?.user ?? null;
      const nextUserId = nextUser?.id ?? null;
      const userChanged = userIdRef.current !== nextUserId;

      setSession(nextSession);

      if (userChanged) {
        userIdRef.current = nextUserId;
        setUser(nextUser);
      }

      if (nextUser && userChanged) {
        setLoading(true);
        fetchUserRole(nextUser.id);
      } else if (!nextUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED') {
        setUser(nextUser);
        setLoading(true);
        fetchUserRole(nextUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await destroyAppSession();
    } catch (err) {
      console.warn('App session logout failed:', err);
    }
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user,
    role,
    session,
    loading,
    signOut,
  }), [user, role, session, loading, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
