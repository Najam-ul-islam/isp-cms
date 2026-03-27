import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {prisma} from './prisma'

  export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10
    return await bcrypt.hash(password, saltRounds)
  }

  export const verifyPassword = async (
    password: string,
    hashedPassword: string
  ): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword)
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

    if (!admin) {
      return null
    }

    const isValid = await verifyPassword(password, admin.password)
    if (!isValid) {
      return null
    }

    return admin
  }