import 'server-only';
import { NextRequest } from 'next/server';
import { adminService } from '@/lib/services/admin.service';
import { createServiceRoleClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

async function resolveProposalEventId(proposalId: string): Promise<string | null> {
  const client = createServiceRoleClient();
  const { data } = await client
    .from('proposals')
    .select('event_id')
    .eq('id', proposalId)
    .single();
  return data?.event_id ?? null;
}

/**
 * Resolve the public.users.id for a Supabase auth user.
 *
 * Foreign keys (events.created_by, event_admins.user_id, proposals.approved_by,
 * …) reference public.users.id, NOT the auth user id. Routes that pass the auth
 * id straight into those columns silently corrupt ownership/permission checks,
 * so every authenticated handler should use this resolved id.
 *
 * Falls back to the auth id only when no users row exists yet (e.g. the
 * handle_new_user trigger hasn't fired), preserving prior behaviour.
 */
export async function resolveDbUserId(authUserId: string): Promise<string> {
  const client = createServiceRoleClient();
  const { data } = await client
    .from('users')
    .select('id')
    .eq('auth_id', authUserId)
    .single();
  return data?.id ?? authUserId;
}

export interface AuthenticatedRequest {
  user: User;
  role: string;
}

/**
 * True if the caller may access a PRIVATE event: either an event admin
 * (JWT in header/cookie) or the holder of a valid invite code (via ?code=
 * or the X-Invite-Code header). Routes that expose event data — event GET,
 * results, exports, analytics — must apply this for private events and
 * return 404 (not 403) so the event's existence isn't leaked to URL probes.
 */
export async function callerCanAccessPrivateEvent(
  request: NextRequest,
  eventId: string
): Promise<boolean> {
  // Admin path — JWT that maps to an event_admins row.
  const token = extractToken(request);
  if (token) {
    const access = await adminService.verifyEventAccess(token, eventId);
    if (access.isAuthorized) return true;
  }

  // Invite-code path — query string or header, whichever the client finds
  // convenient.
  const code =
    request.nextUrl.searchParams.get('code') ||
    request.headers.get('x-invite-code');

  if (code) {
    const client = createServiceRoleClient();
    const { data: invite } = await client
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
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.substring(7);
}

/**
 * Extract Bearer token from cookie
 */
export function extractTokenFromCookie(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies['sb-access-token'] || null;
}

/**
 * Extract JWT token from request (tries Authorization header first, then cookies)
 */
export function extractToken(request: NextRequest): string | null {
  // Try Authorization header first
  const bearerToken = extractBearerToken(request);
  if (bearerToken) return bearerToken;

  // Fallback to cookies
  return extractTokenFromCookie(request);
}

/**
 * Middleware to verify user authentication
 */
export async function requireAuth(request: NextRequest): Promise<{
  success: boolean;
  user?: User;
  userId?: string;
  error?: string
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided'
    };
  }

  // Just verify the token is valid, not event-specific access
  const serviceRoleClient = createServiceRoleClient();
  const { data: { user }, error: authError } = await serviceRoleClient.auth.getUser(token);

  if (authError || !user) {
    return {
      success: false,
      error: authError?.message || 'Invalid authentication token'
    };
  }

  const userId = await resolveDbUserId(user.id);
  return { success: true, user, userId };
}

/**
 * Middleware to verify user has admin access to an event
 */
export async function requireEventAdmin(
  request: NextRequest,
  eventId: string
): Promise<{
  success: boolean;
  user?: User;
  userId?: string;
  role?: string;
  error?: string
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided'
    };
  }

  const result = await adminService.verifyEventAccess(token, eventId);

  if (!result.isAuthorized) {
    return {
      success: false,
      error: result.error || 'Not authorized'
    };
  }

  return {
    success: true,
    user: result.user,
    userId: result.userId,
    role: result.role
  };
}

/**
 * Middleware to verify user has owner access to an event
 */
export async function requireEventOwner(
  request: NextRequest,
  eventId: string
): Promise<{
  success: boolean;
  user?: User;
  userId?: string;
  error?: string
}> {
  const authResult = await requireEventAdmin(request, eventId);

  if (!authResult.success) {
    return authResult;
  }

  if (authResult.role !== 'owner') {
    return {
      success: false,
      error: 'Owner access required'
    };
  }

  return {
    success: true,
    user: authResult.user,
    userId: authResult.userId
  };
}

/**
 * Create standard error responses for authentication failures
 */
export function createAuthErrorResponse(
  error: string,
  status: number = 401
): Response {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create success response with user data
 */
export function createAuthSuccessResponse(
  data: any,
  user: User,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      ...data,
      user: {
        id: user.id,
        email: user.email
      }
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Helper to wrap API handlers with authentication
 */
export function withAuth<T extends Record<string, any>>(
  handler: (request: NextRequest, context: T, user: User, userId: string) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const authResult = await requireAuth(request);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Authentication required');
    }

    return handler(request, context, authResult.user!, authResult.userId!);
  };
}

/**
 * Helper to wrap API handlers with event admin authentication
 */
export function withEventAdmin<T extends { params: { id: string } }>(
  handler: (request: NextRequest, context: T, user: User, role: string, userId: string) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const eventId = context.params.id;
    const authResult = await requireEventAdmin(request, eventId);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Admin access required', 403);
    }

    return handler(request, context, authResult.user!, authResult.role!, authResult.userId!);
  };
}

/**
 * Wrap a handler so the proposal id in `params.id` is resolved to its event,
 * and the caller must be an admin of that event.
 */
export function withProposalAdmin<T extends { params: { id: string } }>(
  handler: (request: NextRequest, context: T, user: User, role: string, userId: string) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const proposalId = context.params.id;
    const eventId = await resolveProposalEventId(proposalId);
    if (!eventId) {
      return createAuthErrorResponse('Proposal not found', 404);
    }
    const authResult = await requireEventAdmin(request, eventId);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Admin access required', 403);
    }
    return handler(request, context, authResult.user!, authResult.role!, authResult.userId!);
  };
}

/**
 * Helper to wrap API handlers with event owner authentication
 */
export function withEventOwner<T extends { params: { id: string } }>(
  handler: (request: NextRequest, context: T, user: User, userId: string) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const eventId = context.params.id;
    const authResult = await requireEventOwner(request, eventId);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Owner access required', 403);
    }

    return handler(request, context, authResult.user!, authResult.userId!);
  };
}