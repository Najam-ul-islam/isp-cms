import { NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth'
import { authenticateAndGenerateTokens } from '@/lib/auth-service'

export async function POST(request: Request) {
  try {
    // Skip CSRF validation for signin (authentication endpoints don't require CSRF tokens)
    // Security is handled through other means (rate limiting, strong passwords, etc.)

    const { email, password, rememberMe = false } = await request.json()
    console.log('[SIGNIN] Attempting signin for:', email)

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
    console.log('[SIGNIN] Calling authenticateAdmin...')

    // Direct prisma lookup for debugging
    const { prisma } = await import('@/lib/prisma');
    
    // Check which database we're connected to
    try {
      const dbCheck = await prisma.$queryRaw`SELECT current_database()`;
      console.log('[SIGNIN] Connected to database:', JSON.stringify(dbCheck));
    } catch (e) {
      console.log('[SIGNIN] Could not check database name');
    }
    
    // List all admins in the database
    const allAdmins = await prisma.admin.findMany({
      select: { email: true, role: true }
    });
    console.log('[SIGNIN] All admins in database:', allAdmins.map(a => a.email).join(', '));
    
    const directAdmin = await prisma.admin.findUnique({ where: { email } });
    console.log('[SIGNIN] Direct prisma lookup:', directAdmin ? `FOUND ${directAdmin.email}` : 'NOT FOUND');
    if (directAdmin) {
      console.log('[SIGNIN] Hash prefix:', directAdmin.password.substring(0, 10));
      const { verifyPassword } = await import('@/lib/auth');
      const isValid = await verifyPassword(password, directAdmin.password);
      console.log('[SIGNIN] Direct password check:', isValid);
    }

    const admin = await authenticateAdmin(email, password)
    console.log('[SIGNIN] authenticateAdmin result:', admin ? 'FOUND' : 'NOT FOUND')

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Auto-migrate password from bcrypt to argon2 on successful login
    const { needsPasswordMigration, hashPassword } = await import('@/lib/auth');
    
    if (needsPasswordMigration(admin.password)) {
      console.log('[SIGNIN] Migrating password from bcrypt to argon2 for:', admin.email);
      const newHash = await hashPassword(password);
      await prisma.admin.update({
        where: { id: admin.id },
        data: { password: newHash }
      });
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