import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/auth-middleware';
import { adminService } from '@/lib/services/admin.service';

export const dynamic = 'force-dynamic';

// Accept an admin invitation
export const POST = withAuth(async (
  request: NextRequest,
  context,
  user
) => {
  try {
    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    const result = await adminService.acceptInvitation(inviteCode, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin invitation accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting admin invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept admin invitation' },
      { status: 500 }
    );
  }
});