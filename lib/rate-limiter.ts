import { headers } from 'next/headers';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Maximum number of requests allowed
  message: string;   // Message to return when rate limit exceeded
}

// Default rate limits for different endpoints
export const RATE_LIMITS = {
  AUTH_SIGNIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts, please try again later.'
  },
  AUTH_SIGNUP: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: 'Too many registration attempts, please try again later.'
  },
  AUTH_GLOBAL: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests
    message: 'Too many requests, please slow down.'
  }
};

// In-memory store for rate limiting (this won't work across server instances)
// For production, use a distributed store like Redis
if (!global.__rateLimitStore) {
  global.__rateLimitStore = new Map();
}

const store = global.__rateLimitStore;

/**
 * Get client IP address from headers
 */
export const getClientIp = async (): Promise<string> => {
  const forwarded = (await headers()).get('x-forwarded-for');
  const realIp = (await headers()).get('x-real-ip');
  const cfConnectingIp = (await headers()).get('cf-connecting-ip'); // Cloudflare
  const xRealIp = (await headers()).get('x-real-ip'); // Nginx

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  // Fallback for development
  return '127.0.0.1';
};

/**
 * Rate limiter function
 */
export const rateLimit = async (
  key: string,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetTime: number; error?: string }> => {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    // New record
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: now + config.windowMs
    };
  }

  if (now > record.resetTime) {
    // Reset the counter after the window has passed
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      success: true,
      remaining: config.max - 1,
      resetTime: now + config.windowMs
    };
  }

  if (record.count >= config.max) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
      error: config.message
    };
  }

  // Increment the count
  record.count++;
  store.set(key, record);

  return {
    success: true,
    remaining: config.max - record.count,
    resetTime: record.resetTime
  };
};

// Global store for rate limiting
declare global {
  var __rateLimitStore: Map<string, { count: number; resetTime: number }> | undefined;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export const rateLimitMiddleware = async (
  endpointKey: keyof typeof RATE_LIMITS,
  customKey?: string
): Promise<{ success: boolean; remaining: number; resetTime: number; error?: string }> => {
  const config = RATE_LIMITS[endpointKey];
  const ip = await getClientIp();
  const key = customKey || `${endpointKey}:${ip}`;

  return rateLimit(key, config);
};

/**
 * Rate limit by email for auth endpoints
 */
export const rateLimitByEmail = async (
  email: string,
  endpointKey: keyof typeof RATE_LIMITS
): Promise<{ success: boolean; remaining: number; resetTime: number; error?: string }> => {
  const config = RATE_LIMITS[endpointKey];
  const ip = await getClientIp();
  const key = `${endpointKey}:email:${email}:${ip}`;

  return rateLimit(key, config);
};