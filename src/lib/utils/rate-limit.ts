export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset?: number;
}

/**
 * Check rate limit for a key
 * Simplified version without Redis - just allows all requests for now
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number // seconds
): Promise<RateLimitResult> {
  // For now, just allow all requests to avoid Redis dependency
  // In production, you could implement rate limiting using Supabase or in-memory
  return { allowed: true, remaining: limit };
}

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  VOTE_SUBMISSION: { limit: 10, window: 60 }, // 10 per minute
  PROPOSAL_SUBMISSION: { limit: 10, window: 3600 }, // 10 per hour
  INVITE_VALIDATION: { limit: 20, window: 60 }, // 20 per minute
  API_GENERAL: { limit: 100, window: 60 }, // 100 per minute
};

