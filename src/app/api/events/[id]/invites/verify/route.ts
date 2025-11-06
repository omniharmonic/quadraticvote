import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase-client';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
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
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .eq('code', code)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'Invalid invite code'
      });
    }

    // Check if invite type allows voting
    if (invite.invite_type === 'proposal_submission') {
      return NextResponse.json({
        success: false,
        valid: false,
        error: 'This code is for proposal submission only'
      });
    }

    // Update invite tracking - mark as opened if not already
    if (!invite.opened_at) {
      await supabase
        .from('invites')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', invite.id);
    }

    return NextResponse.json({
      success: true,
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        inviteType: invite.invite_type,
        openedAt: invite.opened_at
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