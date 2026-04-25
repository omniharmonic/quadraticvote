import { createServiceRoleClient } from '@/lib/supabase';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Postgres-backed sliding-window rate limiter.
 *
 * Calls the public.check_rate_limit() SQL function (defined in the
 * 20260425000100_rate_limits migration), which atomically buckets and
 * counts the current window via UPSERT.
 *
 * Failure is fail-open: if the DB is unreachable or the migration is not
 * applied, requests are allowed through and a warning is logged. This
 * keeps the API up when the side-channel is unhealthy and matches the
 * previous no-op behaviour while degraded.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max_count: limit,
    });

    if (error || !data || data.length === 0) {
      console.warn('[rate-limit] DB call failed, failing open:', error?.message);
      return { allowed: true, remaining: limit };
    }

    const row = data[0] as { allowed: boolean; current_count: number };
    return {
      allowed: row.allowed,
      remaining: Math.max(0, limit - row.current_count),
    };
  } catch (err) {
    console.warn('[rate-limit] unexpected error, failing open:', err);
    return { allowed: true, remaining: limit };
  }
}

export const RATE_LIMITS = {
  VOTE_SUBMISSION: { limit: 10, window: 60 },
  PROPOSAL_SUBMISSION: { limit: 10, window: 3600 },
  INVITE_VALIDATION: { limit: 20, window: 60 },
  API_GENERAL: { limit: 100, window: 60 },
};
