// app/api/auth/refresh/route.ts
export const runtime = 'nodejs'; // ✅ Critical for Prisma

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken, generateAccessToken, setAccessTokenCookie } from '@/lib/token';

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    // ✅ This Prisma query now works because runtime = 'nodejs'
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: 'Refresh token not found or expired' }, { status: 401 });
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken({
      userId: tokenRecord.userId,
      role: tokenRecord.user?.role,
      companyId: tokenRecord.user?.companyId,
    });

    const response = NextResponse.json({ success: true });
    setAccessTokenCookie(response, newAccessToken);

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



// export const runtime = 'nodejs'; // ✅ Force Node.js runtime (not Edge)
// import { NextResponse } from 'next/server';
// import { handleTokenRefresh } from '@/lib/auth-service';

// export async function POST(request: Request) {
//   return await handleTokenRefresh(request as any);
// }