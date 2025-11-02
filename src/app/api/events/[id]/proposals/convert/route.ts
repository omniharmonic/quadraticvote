import { NextRequest, NextResponse } from 'next/server';
import { proposalService } from '@/lib/services/proposal.service';

/**
 * POST /api/events/:id/proposals/convert
 * Convert approved proposals to voting options
 * Admin only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const converted = await proposalService.convertProposalsToOptions(params.id);

    return NextResponse.json({
      success: true,
      converted,
      message: `${converted} proposals converted to voting options`,
    });
  } catch (error) {
    console.error('Proposal conversion error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to convert proposals',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

