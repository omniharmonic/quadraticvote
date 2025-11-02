import { NextRequest, NextResponse } from 'next/server';
import { resultService } from '@/lib/services/result.service';

/**
 * GET /api/events/:id/results
 * Get current results for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const results = await resultService.getResults(params.id);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch results',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

