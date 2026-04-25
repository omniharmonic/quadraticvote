'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/lib/services/auth.service';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  isEventAdmin: (eventId: string) => Promise<boolean>;
  getAdminRole: (eventId: string) => Promise<string | null>;
  getUserAdminEvents: () => Promise<Array<{ event: any; role: string }>>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Resolve the current authenticated user's public.users.id from their auth_id.
 * Relies on the `users_self_read` RLS policy.
 */
async function resolveOwnUserId(authUid: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUid)
    .maybeSingle();
  return data?.id ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      return await authService.signUp(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      return await authService.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      return await authService.signOut();
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  // Admin methods: query directly via the anon client. The new RLS policies
  // (event_admins_self_read, users_self_read) restrict the result to the
  // calling user's own rows, so this is safe.
  const isEventAdmin = async (eventId: string): Promise<boolean> => {
    if (!user) return false;
    const userId = await resolveOwnUserId(user.id);
    if (!userId) return false;
    const { data } = await supabase
      .from('event_admins')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  };

  const getAdminRole = async (eventId: string): Promise<string | null> => {
    if (!user) return null;
    const userId = await resolveOwnUserId(user.id);
    if (!userId) return null;
    const { data } = await supabase
      .from('event_admins')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.role ?? null;
  };

  const getUserAdminEvents = async () => {
    if (!user) return [];
    const userId = await resolveOwnUserId(user.id);
    if (!userId) return [];
    const { data } = await supabase
      .from('event_admins')
      .select('role, event:events(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data ?? []) as Array<{ event: any; role: string }>;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    isEventAdmin,
    getAdminRole,
    getUserAdminEvents,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      window.location.href = '/auth/login';
    }
  }, [auth.loading, auth.isAuthenticated]);

  return auth;
}

export function useEventAdmin(eventId: string) {
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!auth.user || !eventId) {
        setIsAdmin(false);
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRole = await auth.getAdminRole(eventId);
        setIsAdmin(!!userRole);
        setRole(userRole);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [auth, eventId]);

  return { isAdmin, role, loading };
}
