import { NextRequest, NextResponse } from 'next/server';
import { proposalService } from '@/lib/services/proposal.service';
import { submitProposalSchema } from '@/lib/validators';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { redisKeys } from '@/lib/redis/client';

/**
 * POST /api/proposals
 * Submit a new proposal
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = redisKeys.rateLimit('proposal', ip);
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
    
    const statusCode = error instanceof Error && 
      (error.message.includes('Invalid') || error.message.includes('closed'))
      ? 400 
      : 500;

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
      proposals = await proposalService.getProposalsByEventId(eventId, status);
    } else {
      // Get all proposals across all events (for admin interface)
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

