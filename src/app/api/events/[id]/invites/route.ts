import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { createServiceRoleClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils/auth';
import { sendVoterInvite } from '@/lib/services/email.service';
import { eventService } from '@/lib/services/event.service';

const supabase = createServiceRoleClient();
import { withEventAdmin, createAuthErrorResponse } from '@/lib/utils/auth-middleware';

function toClientInvite(row: any) {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    code: row.code,
    inviteType: row.invite_type,
    sentAt: row.sent_at,
    usedAt: row.used_at,
    voteSubmittedAt: row.vote_submitted_at,
    proposalsSubmitted: row.proposals_submitted ?? 0,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export const GET = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user,
  role
) => {
  try {
    const eventId = params.id;

    // Get all invites for the event
    const { data: eventInvites, error } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invites: ${error.message}`);
    }

    const invites = (eventInvites || []).map(toClientInvite);

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
});

export const POST = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user,
  role
) => {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { email, inviteType = 'voting' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if invite already exists for this email and event
    const { data: existingInvite, error: checkError } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // Not found is OK
      throw new Error(`Failed to check existing invite: ${checkError.message}`);
    }

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Invite already exists for this email' },
        { status: 400 }
      );
    }

    // Create new invite
    const inviteData = {
      event_id: eventId,
      email,
      code: generateInviteCode(),
      invite_type: inviteType as 'voting' | 'proposal_submission' | 'both',
      sent_at: new Date().toISOString(),
    };

    const { data: newInvite, error: createError } = await supabase
      .from('invites')
      .insert(inviteData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create invite: ${createError.message}`);
    }

    const event = await eventService.getEventById(eventId);
    const emailResult = event
      ? await sendVoterInvite({
          to: email,
          eventTitle: event.title,
          eventId,
          code: newInvite.code,
          inviteType,
          // Pass the toggles so the email body warns the recipient about
          // gates they're about to hit (sign-in required, ballot is final).
          requireEmailVerification:
            event.voteSettings?.requireEmailVerification === true,
          allowVoteChanges: event.voteSettings?.allowVoteChanges,
          endTime: event.endTime
            ? new Date(event.endTime).toISOString()
            : undefined,
        })
      : { sent: false, error: 'event_not_found' as const };

    return NextResponse.json({
      success: true,
      invite: toClientInvite(newInvite),
      emailSent: emailResult.sent,
      emailError: emailResult.sent ? undefined : emailResult.error,
      message: emailResult.sent
        ? 'Invite created and email sent'
        : 'Invite created (email not sent — share the link manually)',
    });
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
});
