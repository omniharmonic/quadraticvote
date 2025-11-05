import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db/client';
import { invites, events } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateInviteCode } from '@/lib/utils/auth';
import { verifyAdminCode } from '@/lib/utils/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const url = new URL(request.url);
    const adminCode = url.searchParams.get('code');

    // Verify admin access
    if (!adminCode || !(await verifyAdminCode(eventId, adminCode))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all invites for the event
    const eventInvites = await db.select()
      .from(invites)
      .where(eq(invites.eventId, eventId))
      .orderBy(desc(invites.createdAt));

    return NextResponse.json({
      success: true,
      invites: eventInvites
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const url = new URL(request.url);
    const adminCode = url.searchParams.get('code');

    // Verify admin access
    if (!adminCode || !(await verifyAdminCode(eventId, adminCode))) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, inviteType = 'voting' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if invite already exists for this email and event
    const existingInvite = await db.select()
      .from(invites)
      .where(and(
        eq(invites.eventId, eventId),
        eq(invites.email, email)
      ))
      .limit(1);

    if (existingInvite.length > 0) {
      return NextResponse.json(
        { error: 'Invite already exists for this email' },
        { status: 400 }
      );
    }

    // Create new invite
    const inviteData = {
      eventId,
      email,
      code: generateInviteCode(),
      inviteType: inviteType as 'voting' | 'proposal_submission' | 'both',
      sentAt: new Date(),
    };

    const [newInvite] = await db.insert(invites).values(inviteData).returning();

    return NextResponse.json({
      success: true,
      invite: newInvite,
      message: 'Invite created successfully'
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}
