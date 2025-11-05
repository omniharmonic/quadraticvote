import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/event.service';
import { createEventSchema } from '@/lib/validators/index';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';

/**
 * POST /api/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  console.log('=== EVENT CREATION API CALLED ===');
  console.log('Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
    NODE_ENV: process.env.NODE_ENV,
  });

  try {
    // Rate limiting - temporarily disabled for debugging
    try {
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const rateLimitKey = `ratelimit:event_creation:${ip}`;
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
    } catch (rateLimitError) {
      console.warn('Rate limiting failed, proceeding without rate limit:', rateLimitError);
      // Continue without rate limiting if Redis is unavailable
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('Event creation request body:', JSON.stringify(body, null, 2));

    const validationResult = createEventSchema.safeParse(body);

    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.format());
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    console.log('Validated data:', JSON.stringify(validationResult.data, null, 2));

    // Create event with fallback for visibility and proposalConfig
    const eventData = {
      ...validationResult.data,
      visibility: (validationResult.data as any).visibility || 'public', // Fallback to public if missing
      proposalConfig: (validationResult.data as any).proposalConfig || body.proposalConfig || (
        validationResult.data.optionMode === 'community_proposals' ? {
          enabled: true,
          submissionStart: validationResult.data.startTime,
          submissionEnd: validationResult.data.endTime,
          moderation_mode: 'none',
          access_control: 'open'
        } : null
      ),
      // Restore missing fields from original body
      initialOptions: (validationResult.data as any).initialOptions || body.initialOptions,
      voteSettings: {
        ...(validationResult.data as any).voteSettings,
        allowAnonymous: (validationResult.data as any).voteSettings?.allowAnonymous ?? body.voteSettings?.allowAnonymous
      }
    };

    console.log('About to call eventService.createEvent with:', JSON.stringify(eventData, null, 2));
    const event = await eventService.createEvent(eventData);
    console.log('Event created successfully:', event.id);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        event: {
          ...event,
          url: `/events/${event.id}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('=== EVENT CREATION ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Full error object:', error);

    return NextResponse.json(
      {
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
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

