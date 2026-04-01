import { cookies } from 'next/headers';
import { prisma } from './prisma';
// import { TokenPayload } from './token';
import { randomBytes } from 'crypto';

// Session constants
const SESSION_ID_COOKIE = 'session_id';
const MAX_SESSION_IDLE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSION_LIFETIME = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Represents a user session
 */
export interface UserSession {
  id: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  lastActive: Date;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
}

/**
 * Creates a new user session
 */
export const createSession = async (
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<UserSession> => {
  const sessionId = generateSessionId();

  // Create session in database
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      lastActive: new Date(),
      expiresAt: new Date(Date.now() + MAX_SESSION_LIFETIME),
      userAgent,
      ipAddress,
      isActive: true
    }
  });

  // Store session ID in cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_ID_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(MAX_SESSION_LIFETIME / 1000), // Convert to seconds
    path: '/',
    sameSite: 'strict',
  });

  return {
    ...session,
    sessionId: session.id
  };
};

/**
 * Gets the current user session from cookie
 */
export const getCurrentSession = async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_ID_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  return await getSessionById(sessionId);
};

/**
 * Gets a session by its ID
 */
export const getSessionById = async (sessionId: string): Promise<UserSession | null> => {
  try {
    const session = await prisma.session.findUnique({
      where: {
        id: sessionId,
        isActive: true,
        expiresAt: { gte: new Date() } // Not expired
      }
    });

    if (!session) {
      return null;
    }

    // Check if session is still valid (not timed out)
    const timeSinceLastActive = Date.now() - session.lastActive.getTime();
    if (timeSinceLastActive > MAX_SESSION_IDLE_TIME) {
      // Session has timed out, deactivate it
      await deactivateSession(sessionId);
      return null;
    }

    // Update last active time
    await updateSessionLastActive(sessionId);

    return {
      ...session,
      sessionId: session.id
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Updates the last active time for a session
 */
export const updateSessionLastActive = async (sessionId: string): Promise<void> => {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActive: new Date() }
    });
  } catch (error) {
    console.error('Error updating session last active time:', error);
  }
};

/**
 * Deactivates a session (logout)
 */
export const deactivateSession = async (sessionId: string): Promise<boolean> => {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { isActive: false }
    });

    // Remove session cookie
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_ID_COOKIE);

    return true;
  } catch (error) {
    console.error('Error deactivating session:', error);
    return false;
  }
};

/**
 * Deactivates all sessions for a user (global logout)
 */
export const deactivateAllUserSessions = async (userId: string): Promise<number> => {
  try {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: { isActive: false }
    });

    return result.count;
  } catch (error) {
    console.error('Error deactivating user sessions:', error);
    return 0;
  }
};

/**
 * Gets all active sessions for a user
 */
export const getUserSessions = async (userId: string): Promise<UserSession[]> => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gte: new Date() }
      },
      orderBy: { lastActive: 'desc' }
    });
    
    return sessions.map(session => ({
      ...session,
      sessionId: session.id
    }));
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
};

/**
 * Cleans up expired sessions (should be run periodically)
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
};

/**
 * Generates a unique session ID
 */
const generateSessionId = (): string => {
  // Generate a cryptographically secure random ID
  return randomBytes(32).toString('hex');
};

/**
 * Extends a session's lifetime
 */
export const extendSession = async (sessionId: string): Promise<boolean> => {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(Date.now() + MAX_SESSION_LIFETIME),
        lastActive: new Date()
      }
    });

    return true;
  } catch (error) {
    console.error('Error extending session:', error);
    return false;
  }
};

/**
 * Checks if a user has an active session
 */
export const hasActiveSession = async (userId: string): Promise<boolean> => {
  try {
    const session = await prisma.session.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: { gte: new Date() }
      }
    });

    return !!session;
  } catch (error) {
    console.error('Error checking active session:', error);
    return false;
  }
};