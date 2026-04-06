// middleware.ts
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Public routes - skip auth
  const publicRoutes = [
    "/login",
    "/signup",
    "/api/auth/signin",
    "/api/auth/signup", // Add signup API route
    "/api/auth/refresh", // Refresh handles its own auth
  ];
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ✅ API routes: verify token, attach user to headers
  if (pathname.startsWith("/api/")) {
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

  return NextResponse.next();
}

// ✅ Only run middleware on these paths
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};



// // middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { jwtVerify } from 'jose';

// // ✅ Edge-compatible: decode JWT without database
// async function verifyTokenFromCookie(request: NextRequest): Promise<{ userId: string; role?: string } | null> {
//   const token = request.cookies.get('access_token')?.value;
//   if (!token) return null;

//   try {
//     const secret = new TextEncoder().encode(process.env.JWT_SECRET);
//     const { payload } = await jwtVerify(token, secret);
    
//     return {
//       userId: payload.userId as string,
//       role: payload.role as string | undefined,
//     };
//   } catch {
//     return null; // Invalid/expired token
//   }
// }

// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl;

//   // Public routes - no auth required
//   const publicRoutes = ['/login', '/signup', '/api/auth/signin', '/api/auth/refresh'];
//   if (publicRoutes.some(route => pathname.startsWith(route))) {
//     return NextResponse.next();
//   }

//   // Protected API routes
//   if (pathname.startsWith('/api/')) {
//     const tokenData = await verifyTokenFromCookie(request);
    
//     if (!tokenData) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Optional: Role-based checks (without DB)
//     if (pathname.startsWith('/api/admin') && tokenData.role !== 'SUPER_ADMIN') {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//     }

//     // ✅ Add user info to headers for API routes to use
//     const requestHeaders = new Headers(request.headers);
//     requestHeaders.set('x-user-id', tokenData.userId);
//     requestHeaders.set('x-user-role', tokenData.role || '');
    
//     return NextResponse.next({
//       request: { headers: requestHeaders },
//     });
//   }

//   // Protected page routes
//   if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
//     const tokenData = await verifyTokenFromCookie(request);
    
//     if (!tokenData) {
//       // Redirect to login with return URL
//       const loginUrl = new URL('/login', request.url);
//       loginUrl.searchParams.set('redirect', pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//   }

//   return NextResponse.next();
// }

// // ✅ Configure which paths use middleware
// export const config = {
//   matcher: ['/dashboard/:path*', '/admin/:path*', '/api/:path*'],
// };



// import { NextRequest, NextResponse } from 'next/server'
// import { getAuthTokensFromRequest } from '@/lib/token'
// import { verifyAccessToken } from '@/lib/token'
// import { handleTokenRefresh } from '@/lib/auth-service'

// export async function middleware(request: NextRequest) {
//   const { pathname } = request.nextUrl

//   const publicRoutes = ['/login', '/signup']
//   const isPublicRoute = publicRoutes.includes(pathname)

//   // Check for access token in cookies
//   const { accessToken, refreshToken } = getAuthTokensFromRequest(request)

//   let isAuthenticated = false

//   if (accessToken) {
//     // Verify the access token
//     const decoded = verifyAccessToken(accessToken)
//     isAuthenticated = !!decoded
//   }

//   // If not authenticated and we have a refresh token, try to refresh
//   if (!isAuthenticated && refreshToken && !isPublicRoute && !pathname.startsWith('/api/auth')) {
//     // For non-public routes, try to refresh the token
//     const refreshResponse = await handleTokenRefresh(request)

//     if (refreshResponse?.status === 200) {
//       // Token was successfully refreshed, user is now authenticated
//       isAuthenticated = true
//     }
//   }

//   // If user is NOT logged in and trying to access protected route
//   if (!isAuthenticated && !isPublicRoute) {
//     return NextResponse.redirect(new URL('/login', request.url))
//   }

//   // If user IS logged in and tries to open login/signup
//   if (isAuthenticated && isPublicRoute) {
//     return NextResponse.redirect(new URL('/dashboard', request.url))
//   }

//   return NextResponse.next()
// }

// export const config = {
//   matcher: [
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//   ],
// }




