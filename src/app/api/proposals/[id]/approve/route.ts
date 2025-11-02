import { NextRequest, NextResponse } from 'next/server';
import { proposalService } from '@/lib/services/proposal.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    // For now, using a placeholder admin user ID (valid UUID)
    // In production, this should be extracted from authenticated session
    const adminUserId = null; // Allow null for now since admin user table may not have real users

    await proposalService.approveProposal(proposalId, adminUserId);

    return NextResponse.json({
      success: true,
      message: 'Proposal approved successfully'
    });
  } catch (error) {
    console.error('Error approving proposal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve proposal'
      },
      { status: 500 }
    );
  }
}