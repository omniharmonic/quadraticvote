import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/client';
import { invites, events } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/events/[id]/invites/verify
 * Verify an invite code for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    // Verify the event exists first
    const eventResults = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    const event = eventResults[0];

    if (!event) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Event not found'
      });
    }

    // Handle anonymous access for public events
    if (code === 'anonymous' && event.visibility === 'public') {
      return NextResponse.json({
        success: true,
        valid: true,
        invite: {
          id: 'anonymous',
          email: 'anonymous@example.com',
          inviteType: 'voting',
          openedAt: new Date()
        }
      });
    }

    // Find the invite
    const inviteResults = await db.select().from(invites).where(
      and(
        eq(invites.eventId, eventId),
        eq(invites.code, code)
      )
    ).limit(1);

    const invite = inviteResults[0];

    if (!invite) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid invite code'
      });
    }

    // Check if invite type allows voting
    if (invite.inviteType === 'proposal_submission') {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This code is for proposal submission only'
      });
    }


    // Update invite tracking - mark as opened if not already
    if (!invite.openedAt) {
      await db.update(invites)
        .set({ openedAt: new Date() })
        .where(eq(invites.id, invite.id));
    }

    return NextResponse.json({
      success: true,
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        inviteType: invite.inviteType,
        openedAt: invite.openedAt
      }
    });

  } catch (error) {
    console.error('Error verifying invite code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify invite code',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}