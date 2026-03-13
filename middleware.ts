import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicRoutes = ['/login', '/signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Check for token in both header and cookies
  const authHeader = request.headers.get('authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  const tokenFromCookie = request.cookies.get('token')?.value

  const token = tokenFromHeader || tokenFromCookie

  // If user is NOT logged in and trying to access protected route
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user IS logged in and tries to open login/signup
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}


// import { NextRequest, NextResponse } from 'next/server'

// export function middleware(request: NextRequest) {
//   // Define public routes that don't require authentication
//   const publicRoutes = ['/login', '/signup']

//   // Check if the current route is public
//   const isPublicRoute = publicRoutes.some(route =>
//     request.nextUrl.pathname.startsWith(route)
//   )

//   // Get the token from headers (sent by client in Authorization header)
//   const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
//                 request.cookies.get('token')?.value

//   // If the route is not public and there's no token, redirect to login
//   if (!isPublicRoute && !token) {
//     return NextResponse.redirect(new URL('/login', request.url))
//   }

//   // Allow the request to proceed
//   return NextResponse.next()
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for the ones starting with:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//   ],
// }



