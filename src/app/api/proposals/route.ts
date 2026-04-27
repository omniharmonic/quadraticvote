import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { submitProposalSchema } from '@/lib/validators/index';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { requireAuth } from '@/lib/utils/auth-middleware';

/**
 * POST /api/proposals
 * Submit a new proposal
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `ratelimit:proposal:${ip}`;
    const { allowed } = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.PROPOSAL_SUBMISSION.limit,
      RATE_LIMITS.PROPOSAL_SUBMISSION.window
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = submitProposalSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Submit proposal
    const proposal = await proposalService.submitProposal(validationResult.data);

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        status: proposal.status,
        tracking_url: `/proposals/${proposal.id}`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Proposal submission error:', error);
    
    // Map known client-input errors to 4xx so users see actionable messages
    // instead of a generic 500.
    const message = error instanceof Error ? error.message : '';
    const statusCode =
      /not found/i.test(message) ? 404 :
      /reached the limit/i.test(message) ? 429 :
      /invalid|closed|required|only for/i.test(message) ? 400 :
      500;

    return NextResponse.json(
      {
        error: 'Failed to submit proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/proposals?eventId=xxx&status=xxx
 * List proposals for an event, or all proposals if no eventId provided
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status') || undefined;

    let proposals;
    if (eventId) {
      // Per-event listing is public (proposals are visible per event RLS).
      proposals = await proposalService.getProposalsByEventId(eventId, status);
    } else {
      // Cross-event listing is admin-only — require an authenticated user.
      const auth = await requireAuth(request);
      if (!auth.success) {
        return NextResponse.json(
          { error: auth.error || 'Authentication required' },
          { status: 401 }
        );
      }
      proposals = await proposalService.getAllProposals(status);
    }

    return NextResponse.json({
      success: true,
      proposals,
    });
  } catch (error) {
    console.error('Proposals fetch error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch proposals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

