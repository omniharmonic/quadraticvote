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
    // Rate limiting - temporarily disabled for debugging
    try {
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
    console.log('DEBUG: proposalConfig in validated data:', validationResult.data.proposalConfig);
    console.log('DEBUG: initialOptions in validated data:', validationResult.data.initialOptions);

    // Create event with fallback for visibility and proposalConfig
    const eventData = {
      ...validationResult.data,
      visibility: validationResult.data.visibility || 'public', // Fallback to public if missing
      proposalConfig: validationResult.data.proposalConfig || (
        validationResult.data.optionMode === 'community_proposals' ? {
          enabled: true,
          submissionStart: validationResult.data.startTime,
          submissionEnd: validationResult.data.endTime,
          moderation_mode: 'none',
          access_control: 'open'
        } : null
      ),
      // Restore missing fields from original body
      initialOptions: validationResult.data.initialOptions || body.initialOptions,
      voteSettings: {
        ...validationResult.data.voteSettings,
        allowAnonymous: validationResult.data.voteSettings?.allowAnonymous ?? body.voteSettings?.allowAnonymous
      }
    };

    const event = await eventService.createEvent(eventData);

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

