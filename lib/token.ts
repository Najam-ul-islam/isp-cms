import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

export interface TokenPayload {
  userId: string;
  role?: string;
  companyId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string;
}

// 🔐 Encode secrets once
const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

/**
 * Generates an access token (15 minutes)
 */
export const generateAccessToken = async (payload: TokenPayload): Promise<string> => {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(accessSecret);
};

/**
 * Generates a refresh token (7 days)
 */
export const generateRefreshToken = async (
  payload: RefreshTokenPayload
): Promise<string> => {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(refreshSecret);
};

/**
 * Verifies an access token
 */
export const verifyAccessToken = async (
  token: string
): Promise<TokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
};

/**
 * Verifies a refresh token
 */
export const verifyRefreshToken = async (
  token: string
): Promise<RefreshTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as unknown as RefreshTokenPayload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
};

/**
 * Sets both access & refresh tokens in cookies
 */
export const setAuthCookies = async (
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean = false
) => {
  const cookieStore = await cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60,
    path: '/',
    sameSite: 'lax', // ✅ CHANGE: 'strict' → 'lax' (allows redirect from /login)
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60,
    path: '/',
    sameSite: 'lax', // ✅ CHANGE: 'strict' → 'lax'
  });
};

/**
 * Get tokens from cookies()
 */
export const getAuthTokens = async () => {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get('access_token')?.value || null,
    refreshToken: cookieStore.get('refresh_token')?.value || null,
  };
};

/**
 * Clear cookies
 */
export const clearAuthCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
};

/**
 * Set access token in response
 */
export const setAccessTokenCookie = (
  response: NextResponse,
  token: string
) => {
  response.cookies.set('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 15 * 60,
    path: '/',
    sameSite: 'lax', // ✅ CHANGE: 'strict' → 'lax'
  });

  return response;
};

/**
 * Set refresh token in response
 */
export const setRefreshTokenCookie = (
  response: NextResponse,
  token: string,
  rememberMe: boolean = false
) => {
  response.cookies.set('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60,
    path: '/',
    sameSite: 'lax', // ✅ CHANGE: 'strict' → 'lax'
  });

  return response;
};

/**
 * Get tokens from request (middleware safe ✅)
 */
export const getAuthTokensFromRequest = (request: NextRequest) => {
  return {
    accessToken: request.cookies.get('access_token')?.value || null,
    refreshToken: request.cookies.get('refresh_token')?.value || null,
  };
};

/**
 * Rotate access token
 */
export const updateAccessTokenIfNeeded = async (
  response: NextResponse,
  tokenPayload: TokenPayload
) => {
  const newAccessToken = await generateAccessToken(tokenPayload);
  return setAccessTokenCookie(response, newAccessToken);
};



// import jwt from 'jsonwebtoken';
// import { cookies } from 'next/headers';
// import { NextRequest, NextResponse } from 'next/server';

// export interface TokenPayload {
//   userId: string;
//   role?: string;
//   companyId?: string;
// }

// export interface RefreshTokenPayload {
//   userId: string;
//   jti: string; // JWT ID for refresh token tracking
// }

// /**
//  * Generates an access token with a short expiration time
//  */
// export const generateAccessToken = (payload: TokenPayload): string => {
//   return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' }); // 15 minutes
// };

// /**
//  * Generates a refresh token with a longer expiration time
//  */
// export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
//   return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' }); // 7 days
// };

// /**
//  * Verifies an access token
//  */
// export const verifyAccessToken = (token: string): TokenPayload | null => {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
//   } catch (error) {
//     console.error('Access token verification failed:', error);
//     return null;
//   }
// };

// /**
//  * Verifies a refresh token
//  */
// export const verifyRefreshToken = (token: string): RefreshTokenPayload | null => {
//   try {
//     return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
//   } catch (error) {
//     console.error('Refresh token verification failed:', error);
//     return null;
//   }
// };

// /**
//  * Sets both access and refresh tokens as HTTP-only cookies
//  */
// export const setAuthCookies = async (accessToken: string, refreshToken: string, rememberMe: boolean = false) => {
//   const cookieStore = await cookies();

//   // Set access token cookie (short-lived, HTTP-only, secure)
//   cookieStore.set('access_token', accessToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 15 * 60, // 15 minutes
//     path: '/',
//     sameSite: 'strict',
//   });

//   // Set refresh token cookie (longer-lived, HTTP-only, secure)
//   cookieStore.set('refresh_token', refreshToken, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days if rememberMe, else 1 day
//     path: '/',
//     sameSite: 'strict',
//   });
// };

// /**
//  * Gets both access and refresh tokens from cookies
//  */
// export const getAuthTokens = async () => {
//   const cookieStore = await cookies();
//   return {
//     accessToken: cookieStore.get('access_token')?.value || null,
//     refreshToken: cookieStore.get('refresh_token')?.value || null,
//   };
// };

// /**
//  * Clears auth cookies
//  */
// export const clearAuthCookies = async () => {
//   const cookieStore = await cookies();
//   cookieStore.delete('access_token');
//   cookieStore.delete('refresh_token');
// };

// /**
//  * Sets access token as HTTP-only cookie in a NextResponse
//  */
// export const setAccessTokenCookie = (response: NextResponse, token: string) => {
//   response.cookies.set('access_token', token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 15 * 60, // 15 minutes
//     path: '/',
//     sameSite: 'strict',
//   });
//   return response;
// };

// /**
//  * Sets refresh token as HTTP-only cookie in a NextResponse
//  */
// export const setRefreshTokenCookie = (response: NextResponse, token: string, rememberMe: boolean = false) => {
//   response.cookies.set('refresh_token', token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days if rememberMe, else 1 day
//     path: '/',
//     sameSite: 'strict',
//   });
//   return response;
// };

// /**
//  * Gets auth tokens from request cookies
//  */
// export const getAuthTokensFromRequest = (request: NextRequest) => {
//   const accessToken = request.cookies.get('access_token')?.value || null;
//   const refreshToken = request.cookies.get('refresh_token')?.value || null;

//   return { accessToken, refreshToken };
// };

// /**
//  * Updates access token in response if it's about to expire
//  */
// export const updateAccessTokenIfNeeded = (response: NextResponse, tokenPayload: TokenPayload) => {
//   const newAccessToken = generateAccessToken(tokenPayload);
//   return setAccessTokenCookie(response, newAccessToken);
// };