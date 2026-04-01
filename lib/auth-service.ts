import { cookies } from 'next/headers';
import {
  TokenPayload,
  RefreshTokenPayload,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getAuthTokensFromRequest
} from './token';
import { prisma } from './prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a new refresh token and stores it in the database
 */
export const createRefreshToken = async (userId: string, userAgent?: string, ip?: string): Promise<string> => {
  // Generate a unique ID for the refresh token
  const tokenId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const refreshTokenPayload: RefreshTokenPayload = {
    userId,
    jti: tokenId
  };

  const refreshToken = await generateRefreshToken(refreshTokenPayload);

  // Store the refresh token in the database
  try {
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        userAgent,
        ip
      }
    });
  } catch (error) {
    // If the table doesn't exist, log the error but continue
    if ((error as any).code === 'P2021') { // Table does not exist error
      console.warn('Refresh tokens table does not exist. Skipping token storage.');
    } else {
      throw error; // Re-throw other errors
    }
  }

  return refreshToken;
};

/**
 * Validates a refresh token from the database
 */
export const validateRefreshToken = async (token: string): Promise<TokenPayload | null> => {
  const decoded = await verifyRefreshToken(token);

  if (!decoded) {
    return null;
  }

  let refreshTokenRecord;
  try {
    // Fetch the refresh token from the database
    refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: {
        token,
        revoked: false,
        expiresAt: { gt: new Date() } // Not expired
      }
    });
  } catch (error) {
    // If the table doesn't exist, return null indicating invalid token
    if ((error as any).code === 'P2021') { // Table does not exist error
      console.warn('Refresh tokens table does not exist. Authentication may be affected.');
      return null;
    } else {
      throw error; // Re-throw other errors
    }
  }

  if (!refreshTokenRecord) {
    return null;
  }

  // Fetch user from database to ensure they still exist and get their role/company info
  const user = await prisma.admin.findUnique({
    where: { id: decoded.userId }
  });

  if (!user) {
    try {
      // Delete the refresh token if user doesn't exist
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.userId }
      });
    } catch (error) {
      // If the table doesn't exist, just continue
      if ((error as any).code !== 'P2021') { // Table does not exist error
        throw error; // Re-throw other errors
      }
    }
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    companyId: user.companyId
  };
};

/**
 * Revokes a refresh token (marks it as revoked in the database)
 */
export const revokeRefreshToken = async (token: string): Promise<boolean> => {
  try {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true }
    });
    return true;
  } catch (error) {
    // Token might not exist or table might not exist, return false
    if ((error as any).code === 'P2021') { // Table does not exist error
      console.warn('Refresh tokens table does not exist. Skipping token revocation.');
      return false;
    } else if ((error as any).code === 'P2025') { // Record not found
      return false;
    }
    return false;
  }
};

/**
 * Revokes all refresh tokens for a specific user
 */
export const revokeAllUserRefreshTokens = async (userId: string): Promise<number> => {
  try {
    const result = await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });

    return result.count;
  } catch (error) {
    // If the table doesn't exist, return 0
    if ((error as any).code === 'P2021') { // Table does not exist error
      console.warn('Refresh tokens table does not exist. Skipping token revocation.');
      return 0;
    } else {
      throw error; // Re-throw other errors
    }
  }
};

/**
 * Handles token refresh
 */
export const handleTokenRefresh = async (request: NextRequest): Promise<NextResponse | null> => {
  const { refreshToken } = getAuthTokensFromRequest(request);

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token not found' },
      { status: 401 }
    );
  }

  const tokenPayload = await validateRefreshToken(refreshToken);

  if (!tokenPayload) {
    // Invalid refresh token - clear cookies and return error
    const response = NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
    clearAuthCookies();
    return response;
  }

  // Generate new access token
  const newAccessToken = await generateAccessToken(tokenPayload);

  // Get user agent and IP from request (if available)
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

  // Create a new refresh token (rotate the refresh token for security)
  const newRefreshToken = await createRefreshToken(tokenPayload.userId, userAgent, ip);

  // Revoke the old refresh token
  await revokeRefreshToken(refreshToken);

  // Create response with new tokens
  const response = NextResponse.json({
    message: 'Tokens refreshed successfully',
    user: {
      id: tokenPayload.userId,
      role: tokenPayload.role,
      companyId: tokenPayload.companyId
    }
  });

  // Set new tokens in cookies
  setAuthCookies(newAccessToken, newRefreshToken);

  return response;
};

/**
 * Authenticates a user and generates tokens
 */
export const authenticateAndGenerateTokens = async (
  userId: string,
  rememberMe: boolean = false
): Promise<{ accessToken: string; refreshToken: string } | null> => {
  // Fetch user from database to get role and company info
  const user = await prisma.admin.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return null;
  }

  // Create token payloads
  const tokenPayload: TokenPayload = {
    userId: user.id,
    role: user.role,
    companyId: user.companyId
  };

  const accessToken = await generateAccessToken(tokenPayload);
  const refreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken };
};