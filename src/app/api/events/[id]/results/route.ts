import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { resultService } from '@/lib/services/result.service';
import { eventService } from '@/lib/services/event.service';
import { extractToken } from '@/lib/utils/auth-middleware';
import { adminService } from '@/lib/services/admin.service';

/**
 * GET /api/events/:id/results
 *
 * Visibility is gated by the event's display toggles:
 *   - showResultsDuringVoting: results are exposed while voting is open.
 *   - showResultsAfterClose:   results are exposed once voting closes.
 * Event admins can always read results regardless of these toggles.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await eventService.getEventById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Admin bypass — owners and admins always see results.
    let isAdmin = false;
    const token = extractToken(request);
    if (token) {
      const access = await adminService.verifyEventAccess(token, params.id);
      isAdmin = access.isAuthorized;
    }

    if (!isAdmin) {
      const now = new Date();
      const closed = now > new Date(event.endTime);
      if (closed && !event.showResultsAfterClose) {
        return NextResponse.json(
          { error: 'Results are not available for this event' },
          { status: 403 }
        );
      }
      if (!closed && !event.showResultsDuringVoting) {
        return NextResponse.json(
          { error: 'Results will be published when voting closes' },
          { status: 403 }
        );
      }
    }

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

