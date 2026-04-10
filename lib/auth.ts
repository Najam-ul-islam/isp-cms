import * as argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import {prisma} from './prisma'

  export const hashPassword = async (password: string): Promise<string> => {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    })
  }

  export const verifyPassword = async (
    password: string,
    hashedPassword: string
  ): Promise<boolean> => {
    // Check if password is using bcrypt format (legacy)
    // Bcrypt hashes start with $2a$, $2b$, or $2y$
    if (hashedPassword.startsWith('$2')) {
      try {
        // Dynamic import - bcrypt is optional for legacy password migration only
        const bcrypt = await import('bcrypt').catch(() => null);
        if (!bcrypt) {
          console.warn('⚠️  Bcrypt not available - skipping legacy password verification');
          return false;
        }
        return await bcrypt.compare(password, hashedPassword);
      } catch {
        return false;
      }
    }
    
    // Otherwise, try argon2 (new format)
    try {
      return await argon2.verify(hashedPassword, password)
    } catch {
      return false
    }
  }

  export const needsPasswordMigration = (hashedPassword: string): boolean => {
    // Check if password is still using old bcrypt format
    return hashedPassword.startsWith('$2')
  }

  export const migratePassword = async (password: string): Promise<string> => {
    // Re-hash with argon2 (requires the plain password)
    return await hashPassword(password)
  }

  export const generateToken = (userId: string, role?: string, companyId?: string): string => {
    return jwt.sign({ userId, role, companyId }, process.env.JWT_SECRET!, { expiresIn: '24h' })
  }

  export interface TokenPayload {
  userId: string;
  role?: string;
  companyId?: string;
}

export const verifyToken = (token: string): TokenPayload | null => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    } catch (error) {
      return null
    }
  }

  export const authenticateAdmin = async (email: string, password: string) => {
    const admin = await prisma.admin.findUnique({
      where: { email }
    })

    console.log('[AUTH] admin lookup result:', admin ? { id: admin.id, email: admin.email, role: admin.role, passwordPrefix: admin.password.substring(0, 10) } : null)

    if (!admin) {
      return null
    }

    const isValid = await verifyPassword(password, admin.password)
    console.log('[AUTH] password verify result:', isValid)
    if (!isValid) {
      return null
    }

    return admin
  }