import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/event.service';

/**
 * GET /api/events/:id
 * Get event details with options
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

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Event fetch error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

