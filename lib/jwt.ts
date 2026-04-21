// lib/jwt.ts
import { verifyToken } from './auth';
import { prisma } from './prisma';
import type { Package } from '@prisma/client';

export interface AdminWithPackages {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  packages?: Package[];
}


function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  
  for (const cookie of cookieHeader.split(';')) {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      // Decode URI components in cookie values
      try {
        cookies[name] = decodeURIComponent(rest.join('='));
      } catch {
        cookies[name] = rest.join('=');
      }
    }
  }
  
  return cookies;
}

export const getAdminFromToken = async (request: Request): Promise<AdminWithPackages | null> => {
  let token: string | null = null;

  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to cookie - ✅ Use 'access_token' to match your cookie name
  if (!token) {
    const cookies = parseCookie(request.headers.get('cookie'));
    token = cookies.access_token || null; // ✅ Must match cookie name in lib/token.ts
  }

  if (!token) {
    console.warn('🔐 No token found in request');
    return null;
  }

  // Verify token
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    console.warn('🔐 Token verification failed');
    return null;
  }

  // Fetch admin from DB
  const admin = await prisma.admin.findUnique({
    where: { id: decoded.userId },
    include: { packages: true },
  });

  if (!admin) {
    console.warn('🔐 Admin not found in database');
    return null;
  }

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    companyId: admin.companyId,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    packages: admin.packages,
  };
};
