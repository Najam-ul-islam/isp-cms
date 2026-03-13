import bcrypt from 'bcrypt'
  import jwt from 'jsonwebtoken'
  import prisma from './prisma'

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

  export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '24h' })
  }

  export const verifyToken = (token: string): { userId: string } | null => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
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