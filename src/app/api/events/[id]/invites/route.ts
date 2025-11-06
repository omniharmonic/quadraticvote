import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/db/supabase-client';
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
    const { data: eventInvites, error } = await supabase
      .from('invites')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invites: ${error.message}`);
    }

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
