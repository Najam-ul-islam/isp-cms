import { NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth'
import { authenticateAndGenerateTokens } from '@/lib/auth-service'

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe = false } = await request.json()

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

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const admin = await authenticateAdmin(email, password)

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const { needsPasswordMigration, hashPassword } = await import('@/lib/auth');

    if (needsPasswordMigration(admin.password)) {
      const newHash = await hashPassword(password);
      const { prisma } = await import('@/lib/prisma');
      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: newHash }
      });
    }

    const tokens = await authenticateAndGenerateTokens(admin.id, rememberMe)

    if (!tokens) {
      return NextResponse.json(
        { error: 'Failed to generate authentication tokens' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      message: 'Signin successful',
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, companyId: admin.companyId }
    })

    const { setAccessTokenCookie, setRefreshTokenCookie } = await import('@/lib/token')
    setAccessTokenCookie(response, tokens.accessToken)
    setRefreshTokenCookie(response, tokens.refreshToken, rememberMe)

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