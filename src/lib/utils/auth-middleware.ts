import { NextRequest } from 'next/server';
import { adminService } from '@/lib/services/admin.service';
import type { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest {
  user: User;
  role: string;
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
  error?: string
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided'
    };
  }

  const { user, error } = await adminService.verifyEventAccess(token, 'dummy-event');

  if (error || !user) {
    return {
      success: false,
      error: error || 'Invalid authentication token'
    };
  }

  return { success: true, user };
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
    user: authResult.user
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
  handler: (request: NextRequest, context: T, user: User) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const authResult = await requireAuth(request);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Authentication required');
    }

    return handler(request, context, authResult.user!);
  };
}

/**
 * Helper to wrap API handlers with event admin authentication
 */
export function withEventAdmin<T extends { params: { id: string } }>(
  handler: (request: NextRequest, context: T, user: User, role: string) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const eventId = context.params.id;
    const authResult = await requireEventAdmin(request, eventId);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Admin access required', 403);
    }

    return handler(request, context, authResult.user!, authResult.role!);
  };
}

/**
 * Helper to wrap API handlers with event owner authentication
 */
export function withEventOwner<T extends { params: { id: string } }>(
  handler: (request: NextRequest, context: T, user: User) => Promise<Response>
) {
  return async (request: NextRequest, context: T): Promise<Response> => {
    const eventId = context.params.id;
    const authResult = await requireEventOwner(request, eventId);

    if (!authResult.success) {
      return createAuthErrorResponse(authResult.error || 'Owner access required', 403);
    }

    return handler(request, context, authResult.user!);
  };
}