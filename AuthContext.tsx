import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

function withTimeout<T>(promise: PromiseLike<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasRun = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        5000,
        'Profile fetch timeout'
      );
      return data || null;
    } catch (e) {
      console.warn('[Auth] Profile load failed:', e);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await loadProfile(user.id);
      setProfile(p);
    }
  }, [user, loadProfile]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const failSafeTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    withTimeout(
      supabase.auth.getSession(),
      5000,
      'Session fetch timeout'
    )
      .then(({ data, error }) => {
        if (error) {
          console.error('[Auth] Session error:', error.message);
        }

        clearTimeout(failSafeTimer);

        if (data?.session?.user) {
          setUser(data.session.user);
        }
        setLoading(false);

        // Load profile in background (non-blocking)
        if (data?.session?.user) {
          loadProfile(data.session.user.id)
            .then(p => {
              setProfile(p);
            })
            .catch(e => console.warn('[Auth] Profile error:', e));
        }
      })
      .catch((err) => {
        console.error('[Auth] Failed to get session:', err.message);
        clearTimeout(failSafeTimer);
        setLoading(false);
      });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(false);
          loadProfile(session.user.id).then(setProfile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      clearTimeout(failSafeTimer);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, name: name || email.split('@')[0], email
      }, { onConflict: 'id' });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
