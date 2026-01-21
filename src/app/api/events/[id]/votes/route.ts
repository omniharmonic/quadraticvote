import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { voteService } from '@/lib/services/vote.service';
import { submitVoteSchema } from '@/lib/validators/index';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

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

    // Submit vote
    const vote = await voteService.submitVote(
      params.id,
      validationResult.data.inviteCode,
      validationResult.data.allocations,
      {
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
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
    
    const statusCode = error instanceof Error && 
      (error.message.includes('Invalid') || error.message.includes('closed'))
      ? 400 
      : 500;

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

    const vote = await voteService.getVoteByCode(params.id, code);

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

