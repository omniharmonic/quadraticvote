import { redis } from '@/lib/redis/client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset?: number;
}

/**
 * Check rate limit for a key
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number // seconds
): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, window);
    }
    
    if (count > limit) {
      return { allowed: false, remaining: 0 };
    }
    
    return { allowed: true, remaining: limit - count };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if Redis is unavailable
    return { allowed: true, remaining: limit };
  }
}

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  VOTE_SUBMISSION: { limit: 10, window: 60 }, // 10 per minute
  PROPOSAL_SUBMISSION: { limit: 3, window: 3600 }, // 3 per hour
  INVITE_VALIDATION: { limit: 20, window: 60 }, // 20 per minute
  API_GENERAL: { limit: 100, window: 60 }, // 100 per minute
};

