import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use placeholder values during build if env vars are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Fetch wrapper that opts every Supabase request out of Next.js's fetch
 * cache. Next patches global fetch inside route handlers and will happily
 * persist REST GETs (ballots, results, invites…) to .next/cache/fetch-cache,
 * serving stale election data. Live vote data must never be cached.
 */
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

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
      global: {
        fetch: noStoreFetch,
      },
    }
  );
  return cachedServiceRoleClient;
};

/**
 * Lazy service-role client for module-scope `const supabase = …` use.
 *
 * Several services capture the client at import time; calling
 * createServiceRoleClient() there crashes `next build` when env vars are
 * absent (page-data collection imports every route). This Proxy defers
 * client creation to the first property access, which only happens inside
 * request handlers at runtime.
 */
export const lazyServiceRoleClient = (): SupabaseClient =>
  new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = createServiceRoleClient() as any;
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });
