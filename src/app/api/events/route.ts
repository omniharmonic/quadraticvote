import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/event.service';
import { createEventSchema } from '@/lib/validators/index';
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rate-limit';
import { withAuth } from '@/lib/utils/auth-middleware';
import { createServiceRoleClient } from '@/lib/supabase';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

/**
 * POST /api/events
 * Create a new event
 */
export const POST = withAuth(async (request: NextRequest, context, user) => {
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

    // Build the create-event payload. voteSettings is forwarded straight
    // through to the service, which normalizes it against defaults before
    // writing to events.vote_settings.
    const eventData = {
      ...validationResult.data,
      visibility: (validationResult.data as any).visibility || 'public',
      proposalConfig: (validationResult.data as any).proposalConfig || body.proposalConfig || (
        validationResult.data.optionMode === 'community_proposals' ? {
          enabled: true,
          submissionStart: validationResult.data.startTime,
          submissionEnd: validationResult.data.endTime,
          moderation_mode: 'none',
          access_control: 'open'
        } : null
      ),
      initialOptions: (validationResult.data as any).initialOptions || body.initialOptions,
    };

    // Look up the actual user record by auth_id to get the correct ID for the foreign key
    const supabase = createServiceRoleClient();
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    const userId = userRecord?.id || user.id; // Fallback to auth ID if no user record found

    const event = await eventService.createEvent(eventData, userId);

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
    console.error('Event creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create event',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      },
      { status: 500 }
    );
  }
});

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

