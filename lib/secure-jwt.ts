import { verifyAccessToken, TokenPayload } from './token';
import { prisma } from './prisma';
import type { Admin, Package } from '@prisma/client';
import { cookies } from 'next/headers';

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

/**
 * Gets admin information from the access token stored in cookies
 */
export const getAdminFromCookies = async (): Promise<AdminWithPackages | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return null;

  const decoded = await verifyAccessToken(token);
  if (!decoded) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: decoded.userId },
    include: { packages: true },
  });

  if (!admin) return null;

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

/**
 * Gets admin information from a request object (for API routes)
 */
export const getAdminFromRequest = async (request: Request): Promise<AdminWithPackages | null> => {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');

  // If not in header, try to get from cookies
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) return null;

  const decoded = await verifyAccessToken(token);
  if (!decoded) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: decoded.userId },
    include: { packages: true },
  });

  if (!admin) return null;

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