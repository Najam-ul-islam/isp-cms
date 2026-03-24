import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}


// import { PrismaClient } from '@prisma/client'

// declare global {
//   var prisma: PrismaClient | undefined
// }

// // Prevent multiple instances of Prisma Client in development
// const prisma = global.prisma ?? new PrismaClient()

// if (process.env.NODE_ENV !== 'production') global.prisma = prisma

// export default prisma