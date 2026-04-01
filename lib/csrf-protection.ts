import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// CSRF token constants
const CSRF_TOKEN_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TIME_LIMIT = 3600000; // 1 hour in milliseconds

/**
 * Generates a CSRF token and stores it in a cookie
 */
export const generateCsrfToken = async (): Promise<string> => {
  const token = randomBytes(32).toString('hex');
  const cookieStore = await cookies();

  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: false, // Need to access via JS for forms
    secure: process.env.NODE_ENV === 'production',
    maxAge: TIME_LIMIT / 1000, // Convert to seconds
    path: '/',
    sameSite: 'strict',
  });

  return token;
};

/**
 * Validates a CSRF token from the request against the stored token
 */
export const validateCsrfToken = async (requestToken?: string): Promise<boolean> => {
  if (!requestToken) {
    return false;
  }

  const cookieStore = await cookies();
  const storedToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!storedToken) {
    return false;
  }

  // Compare tokens using timing-safe comparison to prevent timing attacks
  return timingSafeEqual(storedToken, requestToken);
};

/**
 * Validates a CSRF token from request headers (for API routes)
 */
export const validateCsrfTokenFromHeaders = async (headers: Headers): Promise<boolean> => {
  const requestToken = headers.get(CSRF_HEADER_NAME);
  return await validateCsrfToken(requestToken || undefined);
};

/**
 * Validates CSRF token in Next.js middleware context
 */
export const validateCsrfTokenFromRequest = async (request: NextRequest): Promise<boolean> => {
  const requestToken = request.headers.get(CSRF_HEADER_NAME);
  return await validateCsrfToken(requestToken || undefined);
};

/**
 * Timing-safe string comparison to prevent timing attacks
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return createHash('sha256').update(bufferA).digest().equals(createHash('sha256').update(bufferB).digest());
  } catch (error) {
    return false;
  }
};

/**
 * Gets the current CSRF token (generates one if none exists)
 */
export const getCsrfToken = async (): Promise<string> => {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_NAME)?.value;

  if (!token) {
    token = await generateCsrfToken();
  }

  return token;
};

/**
 * Middleware to validate CSRF token for protected routes
 */
export const csrfMiddleware = async (request: NextRequest): Promise<{ valid: boolean; error?: string }> => {
  const method = request.method;

  // Safe methods that don't require CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    // For safe methods, generate a new CSRF token if one doesn't exist
    const cookieStore = await cookies();
    const existingToken = cookieStore.get(CSRF_TOKEN_NAME)?.value;

    if (!existingToken) {
      generateCsrfToken();
    }

    return { valid: true };
  }

  // For unsafe methods, validate the CSRF token
  const isValid = validateCsrfTokenFromRequest(request);

  if (!isValid) {
    return { valid: false, error: 'CSRF token mismatch' };
  }

  // Regenerate token after successful validation for additional security
  generateCsrfToken();

  return { valid: true };
};