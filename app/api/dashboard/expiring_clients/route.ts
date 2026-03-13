import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAdminFromToken } from '@/lib/jwt'
import { ClientStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const next7Days = new Date(today)
    next7Days.setDate(today.getDate() + 7)
    next7Days.setHours(23, 59, 59, 999)

    const clients = await prisma.client.findMany({
      where: {
        status: ClientStatus.active,
        expiryDate: {
          gte: today,
          lte: next7Days
        }
      },
      orderBy: {
        expiryDate: 'asc'
      },
      select: {
        id: true,
        name: true,
        phone: true,
        expiryDate: true,
        package: {
          select: {
            name: true
          }
        }
      }
    })

    const result = clients.map(client => {
      const daysLeft = Math.ceil(
        (new Date(client.expiryDate).getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
      )

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        expiryDate: client.expiryDate,
        package: client.package.name, // Extract just the package name as a string
        daysLeft
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Expiring clients error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


// import { NextResponse } from 'next/server'
// import prisma from '@/lib/prisma'
// import { getAdminFromToken } from '@/lib/jwt'

// export async function GET(request: Request) {
//   try {
//     const admin = await getAdminFromToken(request as any)

//     if (!admin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const today = new Date()
//     today.setHours(0, 0, 0, 0)

//     const next7Days = new Date(today)
//     next7Days.setDate(today.getDate() + 7)
//     next7Days.setHours(23, 59, 59, 999)

//     const clients = await prisma.client.findMany({
//       where: {
//         status: 'active',
//         expiryDate: {
//           gte: today,
//           lte: next7Days
//         }
//       },
//       orderBy: {
//         expiryDate: 'asc'
//       },
//       select: {
//         id: true,
//         name: true,
//         phone: true,
//         package: true,
//         expiryDate: true
//       }
//     })

//     const result = clients.map(client => {
//       const daysLeft =
//         Math.ceil(
//           (new Date(client.expiryDate).getTime() - today.getTime()) /
//           (1000 * 60 * 60 * 24)
//         )

//       return {
//         ...client,
//         daysLeft
//       }
//     })

//     return NextResponse.json(result)

//   } catch (error) {
//     console.error('Expiring clients error:', error)

//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }