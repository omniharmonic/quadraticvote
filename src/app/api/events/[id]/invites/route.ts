import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { invites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET /api/events/[id]/invites
 * Get all invites for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;

    const eventInvites = await db.select().from(invites).where(eq(invites.eventId, eventId));

    return NextResponse.json({
      success: true,
      invites: eventInvites,
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch invites',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/invites
 * Create new invites for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { email, inviteType, count = 1 } = await request.json();

    if (!email || !inviteType) {
      return NextResponse.json(
        { success: false, error: 'Email and invite type are required' },
        { status: 400 }
      );
    }

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { success: false, error: 'Count must be between 1 and 100' },
        { status: 400 }
      );
    }

    const createdInvites = [];

    // Create multiple invites
    for (let i = 0; i < count; i++) {
      const code = nanoid(16); // Generate unique code

      const [invite] = await db.insert(invites).values({
        eventId: eventId,
        email: email,
        code: code,
        inviteType: inviteType,
        metadata: {},
      }).returning();

      createdInvites.push(invite);
    }

    return NextResponse.json({
      success: true,
      invites: createdInvites,
      message: `${count} invite(s) created successfully`,
    });
  } catch (error) {
    console.error('Error creating invites:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create invites',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}