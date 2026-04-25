import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use placeholder values during build if env vars are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Client-side Supabase client (uses anon key, enables Supabase Auth)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: true,
  },
});

let cachedServiceRoleClient: SupabaseClient | null = null;

/**
 * Server-side client with service role key. Bypasses RLS.
 * Lazy-initialized so build doesn't crash when env is unset.
 */
export const createServiceRoleClient = (): SupabaseClient => {
  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }

  cachedServiceRoleClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
  return cachedServiceRoleClient;
};
