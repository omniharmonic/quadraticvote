import { supabase, createServiceRoleClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils/auth';
import type { User } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      // Create user record in our database if signup successful
      if (data.user && !error) {
        await this.createUserRecord(data.user);
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get user session
   */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Create user record in our database
   */
  private async createUserRecord(user: User): Promise<void> {
    try {
      const serviceRoleClient = createServiceRoleClient();

      const { error } = await serviceRoleClient
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          email_verified: !!user.email_confirmed_at,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error creating user record:', error);
      }
    } catch (error) {
      console.error('Error creating user record:', error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update password
   */
  async updatePassword(password: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Server-side: Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const serviceRoleClient = createServiceRoleClient();
      const { data, error } = await serviceRoleClient.auth.getUser(token);

      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }
}

export const authService = new AuthService();