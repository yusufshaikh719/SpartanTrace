import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { action, assertDatabaseReady, fromRow, requireClient } from '../services/db';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';

type AuthResult = { success: boolean; requiresVerification?: boolean; error?: string };
interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TIMEOUT = 30 * 60 * 1000;
const validEmail = (email: string) => /^[^\s@]+@sjsu\.edu$/i.test(email);
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Authentication failed.';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');
  const lastActivity = useRef(Date.now());
  const sessionRef = useRef<string | null>(null);
  const generation = useRef(0);
  const signOutPending = useRef<Promise<void> | null>(null);
  const loginPending = useRef(false);

  const logout = useCallback((): Promise<void> => {
    if (signOutPending.current) return signOutPending.current;
    generation.current++;
    const signedInId = sessionRef.current;
    sessionRef.current = null;
    setUser(null);
    localStorage.removeItem('spartantrace_current_user');
    const pending = (async () => {
      const client = getSupabaseClient();
      if (client) {
        if (signedInId) {
          try {
            await client.rpc('app_action', { action: 'logout', payload: {} }).abortSignal(AbortSignal.timeout(5000));
          } catch { /* Database outages must not prevent local/Auth sign-out. */ }
        }
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) setAuthError(error.message);
      }
    })();
    signOutPending.current = pending;
    void pending.finally(() => { if (signOutPending.current === pending) signOutPending.current = null; }).catch(() => undefined);
    return pending;
  }, []);

  const refreshUsers = useCallback(async () => {
    const id = sessionRef.current;
    const current = generation.current;
    if (!id) return;
    // Background reads do not renew the session's last-activity timestamp.
    const { data, error } = await requireClient().from('profiles').select('*').eq('id', id).maybeSingle();
    if (current !== generation.current || sessionRef.current !== id) return;
    if (error) throw new Error(error.message);
    if (!data || data.is_suspended) {
      await logout();
      setAuthError('Your session ended. Please sign in with an active account.');
    } else {
      const profile = fromRow<UserProfile>(data);
      setUser((previous) => previous?.id === id && (previous.name !== profile.name || previous.isAdmin !== profile.isAdmin)
        ? profile : previous);
    }
  }, [logout]);

  useEffect(() => {
    let disposed = false;
    const client = getSupabaseClient();
    // Legacy local identities are never trusted.
    localStorage.removeItem('spartantrace_current_user');
    if (!client) return;
    const restore = async (session: Session | null, current: number) => {
      if (disposed || current !== generation.current || loginPending.current) return;
      if (!session) { sessionRef.current = null; setUser(null); return; }
      if (!validEmail(session.user.email || '') || !session.user.email_confirmed_at) {
        await logout(); setAuthError('Verify your @sjsu.edu email before signing in.'); return;
      }
      try {
        const { data: identity, error } = await client.auth.getUser();
        if (error || identity.user?.id !== session.user.id) throw new Error('Please sign in again.');
        // Initial session start is checked against auth.sessions on the database.
        const profile = await action<UserProfile>('session');
        if (disposed || current !== generation.current) return;
        sessionRef.current = profile.id;
        setUser(profile); setAuthError(''); lastActivity.current = Date.now();
      } catch (error) {
        if (!disposed && current === generation.current) { await logout(); setAuthError(errorText(error)); }
      }
    };
    const initial = generation.current;
    void client.auth.getSession().then(({ data }) => restore(data.session, initial));
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      // Supabase callbacks must return before issuing other Auth requests.
      if (event === 'SIGNED_OUT') { generation.current++; sessionRef.current = null; setUser(null); }
      else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (!loginPending.current && session?.user.id !== sessionRef.current) {
          const current = ++generation.current;
          sessionRef.current = null; setUser(null);
          setTimeout(() => { if (!disposed) void restore(session, current); }, 0);
        }
      }
    });
    return () => { disposed = true; generation.current++; subscription.subscription.unsubscribe(); };
  }, [logout]);

  useEffect(() => {
    if (!user) return;
    const activity = () => {
      if (Date.now() - lastActivity.current >= SESSION_TIMEOUT) {
        void logout(); setAuthError('Your session expired after 30 minutes of inactivity.');
      } else lastActivity.current = Date.now();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    let lastSent = lastActivity.current;
    const timer = setInterval(async () => {
      const current = generation.current;
      if (Date.now() - lastActivity.current >= SESSION_TIMEOUT) {
        await logout(); setAuthError('Your session expired after 30 minutes of inactivity.'); return;
      }
      try {
        if (lastActivity.current > lastSent) {
          await action('session'); lastSent = lastActivity.current;
        } else await refreshUsers();
      } catch (error) { if (current === generation.current) { await logout(); setAuthError(errorText(error)); } }
    }, 15000);
    return () => { clearInterval(timer); events.forEach((event) => window.removeEventListener(event, activity)); };
  }, [user, logout, refreshUsers]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    if (!validEmail(email.trim())) return { success: false, error: 'Enter a valid @sjsu.edu email.' };
    if (!password) return { success: false, error: 'Password is required.' };
    if (loginPending.current) return { success: false, error: 'A sign-in is already in progress.' };
    loginPending.current = true;
    let current = generation.current;
    try {
      await signOutPending.current;
      current = ++generation.current;
      const client = await assertDatabaseReady();
      const config = getSupabaseConfig();
      const response = await fetch(`${config.url}/functions/v1/login`, {
        method: 'POST', headers: { apikey: config.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }), signal: AbortSignal.timeout(30000),
      });
      const session = await response.json();
      if (!response.ok) throw new Error(session.error || 'Sign-in failed. Check that the login function is deployed.');
      if (current !== generation.current) return { success: false, error: 'Sign-in was cancelled. Please try again.' };
      const { data, error } = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
      if (error) throw error;
      if (!data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== email.trim().toLowerCase()) throw new Error('Verify your email before signing in.');
      const profile = await action<UserProfile>('session');
      if (current !== generation.current) return { success: false, error: 'Sign-in was cancelled. Please try again.' };
      sessionRef.current = profile.id; setUser(profile);
      setAuthError(''); lastActivity.current = Date.now();
      return { success: true };
    } catch (error) {
      if (current === generation.current) await logout();
      return { success: false, error: errorText(error) };
    } finally { loginPending.current = false; }
  };
  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
    if (!name.trim()) return { success: false, error: 'Full name is required.' };
    if (!validEmail(email.trim())) return { success: false, error: 'Registration requires a valid @sjsu.edu email.' };
    if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
    try {
      const client = await assertDatabaseReady();
      const { data, error } = await client.auth.signUp({ email: email.trim().toLowerCase(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin } });
      if (error) throw error;
      if (data.session) {
        await logout();
        throw new Error('Email confirmation is disabled in Supabase. Enable Confirm email before registration.');
      }
      return { success: true, requiresVerification: true };
    } catch (error) { return { success: false, error: errorText(error) }; }
  };
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin: !!user?.isAdmin, authError, login, register, logout, refreshUsers }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
