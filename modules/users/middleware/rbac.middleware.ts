import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/secure-jwt';
import { Role } from '@prisma/client';
import { getAuthTokensFromRequest } from '@/lib/token';
import { handleTokenRefresh } from '@/lib/auth-service';

interface PermissionRule {
  [resource: string]: {
    [action: string]: Role[];
  };
}

// Define permission rules
const PERMISSION_RULES: PermissionRule = {
  clients: {
    create: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    read: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN, Role.ADMIN]
  },
  packages: {
    create: [Role.SUPER_ADMIN, Role.ADMIN],
    read: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN]
  },
  payments: {
    create: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    read: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN, Role.ADMIN]
  },
  expenses: {
    create: [Role.SUPER_ADMIN, Role.ADMIN],
    read: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN]
  },
  users: {
    create: [Role.SUPER_ADMIN],
    read: [Role.SUPER_ADMIN, Role.ADMIN],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN]
  },
  complaints: {
    create: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    read: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
    update: [Role.SUPER_ADMIN, Role.ADMIN],
    delete: [Role.SUPER_ADMIN, Role.ADMIN]
  }
};

export const checkPermission = async (
  request: NextRequest,
  requiredRoles: Role[]
): Promise<{ allowed: boolean; userId?: string; userRole?: Role }> => {
  try {
    // Get admin info from the access token
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      // If access token is invalid, try to refresh it
      const { refreshToken } = getAuthTokensFromRequest(request);
      if (refreshToken) {
        // Attempt token refresh
        const refreshResponse = await handleTokenRefresh(request);
        if (refreshResponse?.status === 200) {
          // Successfully refreshed, try to get admin again
          const newAdmin = await getAdminFromRequest(request);
          if (newAdmin) {
            // Check if user has required role
            const hasPermission = requiredRoles.includes(newAdmin.role as Role);

            return {
              allowed: hasPermission,
              userId: newAdmin.id,
              userRole: newAdmin.role as Role
            };
          }
        }
      }

      return { allowed: false };
    }

    // Check if user has required role
    const hasPermission = requiredRoles.includes(admin.role as Role);

    return {
      allowed: hasPermission,
      userId: admin.id,
      userRole: admin.role as Role
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return { allowed: false };
  }
};

export const enforceRBAC = async (
  request: NextRequest,
  resource: string,
  action: string
): Promise<NextResponse | null> => {
  const requiredRoles = PERMISSION_RULES[resource]?.[action] || [Role.SUPER_ADMIN];

  const permissionResult = await checkPermission(request, requiredRoles);

  if (!permissionResult.allowed) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  // Add user info to request for downstream processing
  (request as any).user = {
    id: permissionResult.userId,
    role: permissionResult.userRole
  };

  return null; // Continue with request
};

// Helper to get required roles for a specific resource-action combination
export const getRequiredRoles = (resource: string, action: string): Role[] => {
  return PERMISSION_RULES[resource]?.[action] || [Role.SUPER_ADMIN];
};