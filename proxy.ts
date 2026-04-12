// proxy.ts - Next.js 16+ Authentication Middleware
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ✅ Edge-safe token verification (no Prisma!)
async function verifyAccessToken(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    return {
      userId: payload.userId as string,
      role: payload.role as string | undefined,
      companyId: payload.companyId as string | undefined,
    };
  } catch {
    return null; // Invalid/expired token
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Public routes - skip auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/api/auth/signin",
    "/api/auth/signup", // Add signup API route
    "/api/auth/refresh", // Refresh handles its own auth
    "/api/auth/check", // Check handles its own auth (returns null if not logged in)
  ];
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ✅ API routes: verify token, attach user to headers
  if (pathname.startsWith("/api/")) {
    // Skip auth for SSE stream - it handles its own auth via getAdminFromToken
    // This prevents proxy from interfering with long-lived SSE connections
    if (pathname === "/api/dashboard/stream") {
      return NextResponse.next();
    }

    const user = await verifyAccessToken(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pass user info to API route via headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role || "");
    requestHeaders.set("x-company-id", user.companyId || "");

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ✅ Protected pages: redirect to login if no valid token
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const user = await verifyAccessToken(request);

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ✅ SaaS Super Admin routes: require SUPER_ADMIN role
  if (pathname.startsWith("/saas")) {
    const user = await verifyAccessToken(request);

    if (!user || user.role !== "SUPER_ADMIN") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// ✅ Only run middleware on these paths
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*', 
    '/saas/:path*',
    '/api/:path*',
    '/', // Root path
    '/login',
    '/signup',
  ],
};