import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, TokenPayload } from '../lib/token';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends NextRequest {
  companyId?: string;
  userId?: string;
  role?: string;
}

export interface AuthResult {
  companyId: string;
  userId: string;
  role: string;
}

const INVALID_TOKEN_ERROR = '🚫 Invalid or expired token';
const MISSING_AUTH_HEADERError = '🚫 Authorization header required';
const USER_NOT_FOUND_ERROR = '🚫 User not found';
const COMPANY_MISSING_ERROR = '🚫 Company ID is missing from token';

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length) acc[name] = rest.join('=');
    return acc;
  }, {} as Record<string, string>);
}

async function extractToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(request.headers.get('cookie'));
  return cookies.access_token || null;
}

async function verifyTokenPayload(token: string): Promise<TokenPayload | null> {
  return await verifyAccessToken(token);
}

export async function authenticateRequest(request: NextRequest): Promise<AuthResult | null> {
  const token = await extractToken(request);
  
  if (!token) {
    console.warn('[AUTH] No token found in request');
    return null;
  }

  const payload = await verifyTokenPayload(token);
  if (!payload) {
    console.warn('[AUTH] Token verification failed');
    return null;
  }

  if (!payload.companyId) {
    console.warn('[AUTH] Token missing companyId');
    return null;
  }

  if (!payload.userId) {
    console.warn('[AUTH] Token missing userId');
    return null;
  }

  const admin = await prisma.admin.findUnique({
    where: { id: payload.userId },
    select: { id: true, companyId: true, role: true },
  });

  if (!admin) {
    console.warn('[AUTH] Admin not found in database');
    return null;
  }

  if (admin.companyId !== payload.companyId) {
    console.warn('[AUTH] Admin companyId mismatch');
    return null;
  }

  return {
    companyId: payload.companyId,
    userId: payload.userId,
    role: payload.role || admin.role,
  };
}

export async function requireAuth(
  request: NextRequest
): Promise<{ auth: AuthResult; request: NextRequest }> {
  const auth = await authenticateRequest(request);

  if (!auth) {
    throw new Error(INVALID_TOKEN_ERROR);
  }

  Object.defineProperty(request, 'companyId', {
    value: auth.companyId,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(request, 'userId', {
    value: auth.userId,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(request, 'role', {
    value: auth.role,
    writable: false,
    configurable: false,
  });

  return { auth, request };
}

export function createAuthMiddleware() {
  return async (request: NextRequest, handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    const auth = await authenticateRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: INVALID_TOKEN_ERROR },
        { status: 401 }
      );
    }

    const authRequest = request as AuthenticatedRequest;
    authRequest.companyId = auth.companyId;
    authRequest.userId = auth.userId;
    authRequest.role = auth.role;

    return handler(authRequest);
  };
}

export function authMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await authenticateRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: INVALID_TOKEN_ERROR },
        { status: 401 }
      );
    }

    const authRequest = request as AuthenticatedRequest;
    authRequest.companyId = auth.companyId;
    authRequest.userId = auth.userId;
    authRequest.role = auth.role;

    return handler(authRequest);
  };
}

export function requireCompanyId(request: AuthenticatedRequest): string {
  if (!request.companyId) {
    throw new Error(COMPANY_MISSING_ERROR);
  }
  return request.companyId;
}