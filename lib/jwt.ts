import { NextRequest } from 'next/server'
  import { verifyToken } from './auth'
  import prisma from './prisma'

  export const getAdminFromToken = async (req: NextRequest) => {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return null
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return null
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.userId }
    })

    return admin
  }