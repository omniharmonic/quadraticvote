import { NextRequest, NextResponse } from 'next/server';
import { withEventAdmin } from '@/lib/utils/auth-middleware';
import { adminService } from '@/lib/services/admin.service';

export const dynamic = 'force-dynamic';

// Invite a new admin to the event
export const POST = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user,
  role
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

    const result = await adminService.inviteAdmin(eventId, email, inviteRole, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      inviteCode: result.inviteCode,
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