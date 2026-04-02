import { NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth'
import { authenticateAndGenerateTokens } from '@/lib/auth-service'

export async function POST(request: Request) {
  try {
    // Skip CSRF validation for signin (authentication endpoints don't require CSRF tokens)
    // Security is handled through other means (rate limiting, strong passwords, etc.)

    const { email, password, rememberMe = false } = await request.json()

    // Apply rate limiting based on email after parsing it
    const { rateLimitByEmail } = await import('@/lib/rate-limiter');
    const rateLimitResult = await rateLimitByEmail(email, 'AUTH_SIGNIN');

    if (!rateLimitResult.success) {
      return Response.json(
        { error: rateLimitResult.error },
        { status: 429, headers: {
          'Retry-After': Math.floor(rateLimitResult.resetTime / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        }}
      );
    }

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate admin
    const admin = await authenticateAdmin(email, password)

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate access and refresh tokens
    const tokens = await authenticateAndGenerateTokens(admin.id, rememberMe)

    if (!tokens) {
      return NextResponse.json(
        { error: 'Failed to generate authentication tokens' },
        { status: 500 }
      )
    }

    // Set tokens in HTTP-only cookies
    const response = NextResponse.json({
      message: 'Signin successful',
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, companyId: admin.companyId }
    })

    // Set both access and refresh tokens as HTTP-only cookies
    const { setAccessTokenCookie, setRefreshTokenCookie } = await import('@/lib/token')
    setAccessTokenCookie(response, tokens.accessToken)
    setRefreshTokenCookie(response, tokens.refreshToken, rememberMe)

    // Create a session for the user
    const { createSession } = await import('@/lib/session-manager');
    const userAgent = request.headers.get('user-agent') || undefined;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;

    await createSession(admin.id, userAgent, ip);

    return response
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}