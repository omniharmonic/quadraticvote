import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';
import { withEventAdmin } from '@/lib/utils/auth-middleware';

/**
 * POST /api/events/[id]/proposals/convert
 * Convert all approved proposals to voting options for an event.
 * Caller must be an admin of the event.
 */
export const POST = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const convertedCount = await proposalService.convertProposalsToOptions(params.id);
    return NextResponse.json({
      success: true,
      message: `Successfully converted ${convertedCount} proposals to voting options`,
      convertedCount,
    });
  } catch (error) {
    console.error('Error converting proposals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to convert proposals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
