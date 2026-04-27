import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { voteService, computeAnonInviteCode } from '@/lib/services/vote.service';
import { submitVoteSchema } from '@/lib/validators/index';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { extractToken } from '@/lib/utils/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * POST /api/events/:id/votes
 * Submit or update a vote
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting - with graceful degradation
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    try {
      const rateLimitKey = `ratelimit:vote:${ip}`;
      const { allowed } = await checkRateLimit(
        rateLimitKey,
        RATE_LIMITS.VOTE_SUBMISSION.limit,
        RATE_LIMITS.VOTE_SUBMISSION.window
      );

      if (!allowed) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      console.warn('Rate limiting failed for vote submission, proceeding without rate limit:', rateLimitError);
      // Continue without rate limiting if Redis is unavailable
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = submitVoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Optional auth — only used when an event has requireEmailVerification on.
    // Voting is otherwise unauthenticated, so a missing/invalid token is fine.
    let auth: { userId?: string; email?: string; emailVerified?: boolean } | undefined;
    const token = extractToken(request);
    if (token) {
      try {
        const sb = createServiceRoleClient();
        const { data, error } = await sb.auth.getUser(token);
        if (!error && data?.user) {
          auth = {
            userId: data.user.id,
            email: data.user.email ?? undefined,
            emailVerified: !!data.user.email_confirmed_at,
          };
        }
      } catch {
        // Treat any auth failure as unauthenticated — vote.service will
        // reject the submission if the event requires verification.
      }
    }

    // Submit vote
    const vote = await voteService.submitVote(
      params.id,
      validationResult.data.inviteCode,
      validationResult.data.allocations,
      {
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
        auth,
      }
    );

    return NextResponse.json({
      success: true,
      vote: {
        id: vote.id,
        receipt_code: vote.invite_code,
        submitted_at: vote.submitted_at,
      },
    });
  } catch (error) {
    console.error('Vote submission error:', error);
    
    // Map known client-input errors to 4xx so users see actionable
    // messages instead of generic 500s.
    const message = error instanceof Error ? error.message : '';
    const statusCode =
      /not found/i.test(message) ? 404 :
      /verified email|not started|closed|invalid|anonymous voting|allow vote changes|already been recorded/i.test(message) ? 400 :
      500;

    return NextResponse.json(
      {
        error: 'Failed to submit vote',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/events/:id/votes?code=xxx
 * Get voter's current vote
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code required' },
        { status: 400 }
      );
    }

    // For anonymous voters, resolve to the same IP+UA-derived hash that
    // submitVote uses when writing — otherwise a returning voter never
    // sees their existing ballot.
    const lookupCode =
      code === 'anonymous'
        ? computeAnonInviteCode(
            params.id,
            request.headers.get('x-forwarded-for') || 'unknown',
            request.headers.get('user-agent') || undefined
          )
        : code;

    const vote = await voteService.getVoteByCode(params.id, lookupCode);

    return NextResponse.json({
      success: true,
      vote,
    });
  } catch (error) {
    console.error('Vote fetch error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch vote',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

