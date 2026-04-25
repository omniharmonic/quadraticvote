import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { withProposalAdmin } from '@/lib/utils/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * POST /api/proposals/[id]/approve
 * Approve a specific proposal. Caller must be admin of the proposal's event.
 */
export const POST = withProposalAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    const proposalId = params.id;

    // Resolve auth user → users.id for the approved_by foreign key
    const supabase = createServiceRoleClient();
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const userId = userRecord?.id ?? null;

    await proposalService.approveProposal(proposalId, userId);

    return NextResponse.json({
      success: true,
      message: 'Proposal approved successfully',
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
