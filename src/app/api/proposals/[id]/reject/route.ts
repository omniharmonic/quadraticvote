import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { withProposalAdmin } from '@/lib/utils/auth-middleware';

async function handleRejection(
  request: NextRequest,
  params: { id: string },
  userId: string
) {
  try {
    const proposalId = params.id;
    const { reason } = await request.json();

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // userId is the resolved public.users.id (rejected_by foreign key target).
    await proposalService.rejectProposal(proposalId, reason, userId);

    return NextResponse.json({
      success: true,
      message: 'Proposal rejected successfully',
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject proposal',
      },
      { status: 500 }
    );
  }
}

export const PATCH = withProposalAdmin(async (request, { params }, user, role, userId) =>
  handleRejection(request, params, userId)
);

export const POST = withProposalAdmin(async (request, { params }, user, role, userId) =>
  handleRejection(request, params, userId)
);
