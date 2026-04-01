import { NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/token'
import { revokeRefreshToken } from '@/lib/auth-service'

export async function POST(request: Request) {
  try {
    // Rate limiting for logout attempts
    const { rateLimitMiddleware } = await import('@/lib/rate-limiter');
    const rateLimitResult = await rateLimitMiddleware('AUTH_GLOBAL');

    if (!rateLimitResult.success) {
      return Response.json(
        { error: rateLimitResult.error },
        { status: 429, headers: {
          'Retry-After': Math.floor(rateLimitResult.resetTime / 1000).toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }}
      );
    }

    // Validate CSRF token for security
    const { csrfMiddleware } = await import('@/lib/csrf-protection');
    const validation = await csrfMiddleware(request as any);

    if (!validation.valid) {
      return Response.json(
        { error: validation.error || 'CSRF validation failed' },
        { status: 403 }
      );
    }

    // Get the refresh token to revoke it
    const { refreshToken } = getAuthTokensFromRequest(request as any);

    // Revoke the refresh token if it exists
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Create a response that clears the auth cookies
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });

    // Clear both access and refresh token cookies
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    // Deactivate the user session
    const { getCurrentSession, deactivateSession } = await import('@/lib/session-manager');
    const currentSession = await getCurrentSession();

    if (currentSession) {
      await deactivateSession(currentSession.id);
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}