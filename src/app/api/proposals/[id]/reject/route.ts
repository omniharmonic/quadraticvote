import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { withProposalAdmin } from '@/lib/utils/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

async function handleRejection(
  request: NextRequest,
  params: { id: string },
  user: User
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

    const supabase = createServiceRoleClient();
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    await proposalService.rejectProposal(proposalId, reason, userRecord?.id);

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

export const PATCH = withProposalAdmin(async (request, { params }, user) =>
  handleRejection(request, params, user)
);

export const POST = withProposalAdmin(async (request, { params }, user) =>
  handleRejection(request, params, user)
);
