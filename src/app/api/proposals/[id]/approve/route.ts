import { NextRequest, NextResponse } from 'next/server';
import { proposalService } from '@/lib/services/proposal.service';

/**
 * POST /api/proposals/[id]/approve
 * Approve a specific proposal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    if (!proposalId) {
      return NextResponse.json(
        { success: false, error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    // For now, we don't have user authentication, so we'll pass null for adminUserId
    await proposalService.approveProposal(proposalId, null);

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
}
