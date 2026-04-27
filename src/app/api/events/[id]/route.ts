import { NextRequest, NextResponse } from 'next/server';
import { eventService } from '@/lib/services/event.service';
import { updateEventSchema } from '@/lib/validators/index';
import {
  withEventAdmin,
  withEventOwner,
  extractToken,
} from '@/lib/utils/auth-middleware';
import { adminService } from '@/lib/services/admin.service';
import { createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/:id
 *
 * Visibility gates:
 *  - public:    anyone can fetch.
 *  - unlisted:  anyone with the URL can fetch (intentional — that's the whole
 *               point of "unlisted").
 *  - private:   only event admins or holders of a valid invite code (passed
 *               via ?code=) can fetch. Everyone else gets a 404 so the
 *               event's existence isn't leaked.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await eventService.getEventById(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.visibility === 'private') {
      const allowed = await callerCanAccessPrivateEvent(request, params.id);
      if (!allowed) {
        // 404 on purpose — don't leak existence to drive-by URL probes.
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Event fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * True if the caller is an event admin OR carries a valid invite code for
 * the event. Used to gate access to private events.
 */
async function callerCanAccessPrivateEvent(
  request: NextRequest,
  eventId: string
): Promise<boolean> {
  // Admin path — JWT in header/cookie that maps to an event_admins row.
  const token = extractToken(request);
  if (token) {
    const access = await adminService.verifyEventAccess(token, eventId);
    if (access.isAuthorized) return true;
  }

  // Invite-code path — code can come from either the query string or the
  // X-Invite-Code header. Either format is fine; clients use whichever is
  // most convenient.
  const code =
    request.nextUrl.searchParams.get('code') ||
    request.headers.get('x-invite-code');

  if (code) {
    const sb = createServiceRoleClient();
    const { data: invite } = await sb
      .from('invites')
      .select('id')
      .eq('event_id', eventId)
      .eq('code', code)
      .maybeSingle();
    if (invite) return true;
  }

  return false;
}

/**
 * PATCH /api/events/:id — admin-only. Updates fields backed by real
 * columns (see updateEventSchema). Unknown fields are rejected.
 */
export const PATCH = withEventAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event update', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const event = await eventService.updateEvent(params.id, parsed.data);
    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Event update error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const notFound = /not found/i.test(message);
    return NextResponse.json(
      { error: notFound ? 'Event not found' : 'Failed to update event', message },
      { status: notFound ? 404 : 500 }
    );
  }
});

/**
 * DELETE /api/events/:id — owner-only. Soft-delete via deleted_at.
 */
export const DELETE = withEventOwner(async (
  _request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      console.error('Event delete error:', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
});
