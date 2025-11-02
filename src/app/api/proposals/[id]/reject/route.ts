import { NextRequest, NextResponse } from 'next/server';
import { proposalService } from '@/lib/services/proposal.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required'
        },
        { status: 400 }
      );
    }

    await proposalService.rejectProposal(proposalId, reason);

    return NextResponse.json({
      success: true,
      message: 'Proposal rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject proposal'
      },
      { status: 500 }
    );
  }
}