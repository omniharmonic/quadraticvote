import { supabase } from '@/lib/supabase';

/**
 * fetch() variant that attaches the current Supabase session's access token
 * as `Authorization: Bearer <jwt>`. Use from client components that hit
 * authenticated API routes (anything wrapped in withAuth/withEventAdmin).
 *
 * If there is no session, the request goes out unauthenticated and the
 * server will reject with 401 — caller should redirect to login.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
