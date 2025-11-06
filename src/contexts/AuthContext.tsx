'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/lib/services/auth.service';
import { adminService } from '@/lib/services/admin.service';
import { supabase } from '@/lib/db/supabase-client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  // User state
  user: User | null;
  session: Session | null;
  loading: boolean;

  // Authentication methods
  signUp: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;

  // Admin methods
  isEventAdmin: (eventId: string) => Promise<boolean>;
  getAdminRole: (eventId: string) => Promise<string | null>;
  getUserAdminEvents: () => Promise<any[]>;

  // Utility methods
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Authentication methods
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signUp(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await authService.signIn(email, password);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    return authService.resetPassword(email);
  };

  // Admin methods
  const isEventAdmin = async (eventId: string): Promise<boolean> => {
    if (!user) return false;
    return adminService.isEventAdmin(user.id, eventId);
  };

  const getAdminRole = async (eventId: string): Promise<string | null> => {
    if (!user) return null;
    return adminService.getAdminRole(user.id, eventId);
  };

  const getUserAdminEvents = async () => {
    if (!user) return [];
    return adminService.getUserAdminEvents(user.id);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Utility hook for requiring authentication
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  }, [auth.loading, auth.isAuthenticated]);

  return auth;
}

// Utility hook for checking event admin status
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
        const [adminStatus, userRole] = await Promise.all([
          auth.isEventAdmin(eventId),
          auth.getAdminRole(eventId)
        ]);

        setIsAdmin(adminStatus);
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
  }, [auth.user, eventId]);

  return { isAdmin, role, loading };
}