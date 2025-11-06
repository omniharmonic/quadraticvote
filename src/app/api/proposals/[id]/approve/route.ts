import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { withAuth } from '@/lib/utils/auth-middleware';

/**
 * POST /api/proposals/[id]/approve
 * Approve a specific proposal
 */
export const POST = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    const proposalId = params.id;

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    await proposalService.approveProposal(proposalId, user.id);

    return NextResponse.json({
      success: true,
      message: 'Proposal approved successfully'
    });

  } catch (error) {
    console.error('Error approving proposal:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve proposal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
