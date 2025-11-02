import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/event.service';
import { createEventSchema } from '@/lib/validators';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { redisKeys } from '@/lib/redis/client';

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = redisKeys.rateLimit('event_creation', ip);
    const { allowed } = await checkRateLimit(
      rateLimitKey,
      RATE_LIMITS.API_GENERAL.limit,
      RATE_LIMITS.API_GENERAL.window
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    // Create event
    const event = await eventService.createEvent(validationResult.data);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        event: {
          id: event.id,
          url: `/events/${event.id}`,
          ...event,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Event creation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events
 * List all active public events
 */
export async function GET(request: NextRequest) {
  try {
    const events = await eventService.getActiveEvents();

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Event listing error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

