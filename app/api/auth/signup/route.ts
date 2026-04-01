import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authenticateAndGenerateTokens } from '@/lib/auth-service'

export async function POST(request: Request) {
  try {
    // Validate CSRF token for security
    const { csrfMiddleware } = await import('@/lib/csrf-protection');
    const csrfValidation = await csrfMiddleware(request as any);

    if (!csrfValidation.valid) {
      return Response.json(
        { error: csrfValidation.error || 'CSRF validation failed' },
        { status: 403 }
      );
    }

    const { name, email, password, rememberMe = false } = await request.json()

    // Apply rate limiting based on email
    const { rateLimitByEmail } = await import('@/lib/rate-limiter');
    const rateLimitResult = await rateLimitByEmail(email, 'AUTH_SIGNUP');

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
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if admin already exists
    const adminCount = await prisma.admin.count()

    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email }
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create a company first (for now, using a default company approach)
    // In a real scenario, we'd have a proper company creation flow
    // For now, we'll create a company with the admin's name as the company name
    const company = await prisma.company.create({
      data: {
        name: `${name}'s Company`,
      }
    });

    // If this is the first user signing up, make them a SUPER_ADMIN
    // Otherwise, default to EMPLOYEE role
    const role = adminCount === 0 ? 'SUPER_ADMIN' : 'EMPLOYEE';

    // Create admin with appropriate role and assign to company
    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,  // First user gets SUPER_ADMIN, others get EMPLOYEE
        companyId: company.id
      }
    })

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
      message: 'Admin created successfully',
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
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}