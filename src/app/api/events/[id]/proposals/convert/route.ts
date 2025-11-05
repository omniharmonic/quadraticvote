import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { proposalService } from '@/lib/services/proposal.service';

/**
 * POST /api/events/[id]/proposals/convert
 * Convert all approved proposals to voting options for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Convert approved proposals to options
    const convertedCount = await proposalService.convertProposalsToOptions(eventId);

    return NextResponse.json({
      success: true,
      message: `Successfully converted ${convertedCount} proposals to voting options`,
      convertedCount
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
}
