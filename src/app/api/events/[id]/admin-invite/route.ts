import { NextRequest, NextResponse } from 'next/server';
import { withEventAdmin } from '@/lib/utils/auth-middleware';
import { adminService } from '@/lib/services/admin.service';

export const dynamic = 'force-dynamic';

// Invite a new admin to the event
export const POST = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user,
  role,
  userId
) => {
  try {
    const eventId = params.id;
    const body = await request.json();
    const { email, role: inviteRole = 'admin' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (inviteRole !== 'admin' && inviteRole !== 'owner') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "owner"' },
        { status: 400 }
      );
    }

    // Pass the resolved public.users.id — inviteAdmin checks the inviter's
    // role via event_admins.user_id, which references public.users.id.
    const result = await adminService.inviteAdmin(eventId, email, inviteRole, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Note: inviteCode is intentionally NOT returned. The code is a bearer
    // secret delivered to the invitee by email; echoing it in the API
    // response would leak it into logs, proxies, and the browser.
    return NextResponse.json({
      success: true,
      message: 'Admin invitation sent successfully'
    });
  } catch (error) {
    console.error('Error inviting admin:', error);
    return NextResponse.json(
      { error: 'Failed to send admin invitation' },
      { status: 500 }
    );
  }
});

// Get pending admin invitations for the event
export const GET = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user,
  role
) => {
  try {
    const eventId = params.id;
    const invitations = await adminService.getEventInvitations(eventId);

    return NextResponse.json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('Error fetching admin invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin invitations' },
      { status: 500 }
    );
  }
});