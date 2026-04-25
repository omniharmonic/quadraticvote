import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Browser-safe wrapper around Supabase Auth.
 * No service-role calls — safe to import from client components.
 */
export class AuthService {
  async signUp(email: string, password: string, redirectUrl?: string) {
    try {
      const baseUrl = redirectUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${baseUrl}/auth/callback` },
      });
      if (error) return { user: null, error: new Error(error.message) };
      // The `handle_new_user` Postgres trigger creates the public.users row.
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { user: null, error: new Error(error.message) };
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async resetPassword(email: string, redirectUrl?: string) {
    try {
      const baseUrl = redirectUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/reset-password`,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async updatePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }
}

export const authService = new AuthService();
