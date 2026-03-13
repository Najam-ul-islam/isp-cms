import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAdminFromToken } from '@/lib/jwt'
import { ClientStatus, PaymentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const next3Days = new Date(today)
    next3Days.setDate(today.getDate() + 3)

    const next7Days = new Date(today)
    next7Days.setDate(today.getDate() + 7)

    // ======================
    // SECTION 1
    // ======================

    const totalUsers = await prisma.client.count()

    const activeUsers = await prisma.client.count({
      where: { status: ClientStatus.active }
    })

    const expiredUsers = await prisma.client.count({
      where: { status: ClientStatus.expired }
    })

    // ======================
    // SECTION 2
    // ======================

    const expireToday = await prisma.client.count({
      where: {
        expiryDate: {
          gte: today,
          lte: endOfDay
        },
        status: ClientStatus.active
      }
    })

    const expireNext3Days = await prisma.client.count({
      where: {
        expiryDate: {
          gt: endOfDay,
          lte: next3Days
        },
        status: ClientStatus.active
      }
    })

    const expireNext7Days = await prisma.client.count({
      where: {
        expiryDate: {
          gt: next3Days,
          lte: next7Days
        },
        status: ClientStatus.active
      }
    })

    // ======================
    // SECTION 3
    // ======================

    const paidToday = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        paymentStatus: PaymentStatus.paid,
        expiryDate: {
          gte: today,
          lte: endOfDay
        }
      }
    })

    const dueToday = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        paymentStatus: PaymentStatus.unpaid,
        expiryDate: {
          gte: today,
          lte: endOfDay
        }
      }
    })

    const dueNext7Days = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        paymentStatus: PaymentStatus.unpaid,
        expiryDate: {
          gt: endOfDay,
          lte: next7Days
        }
      }
    })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      expiredUsers,

      expireToday,
      expireNext3Days,
      expireNext7Days,

      paidToday: paidToday._sum.price || 0,
      dueToday: dueToday._sum.price || 0,
      dueNext7Days: dueNext7Days._sum.price || 0
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}



// import { NextResponse } from 'next/server'
// import { getAdminFromToken } from '@/lib/jwt'
// import prisma from '@/lib/prisma'
// import { PrismaClient, ClientStatus } from '@prisma/client'

// export async function GET(request: Request) {
//   try {
//     const admin = await getAdminFromToken(request as any)

//     if (!admin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const today = new Date()
//     today.setHours(0, 0, 0, 0)

//     const endOfDay = new Date(today)
//     endOfDay.setHours(23, 59, 59, 999)

//     const tomorrow = new Date(today)
//     tomorrow.setDate(today.getDate() + 1)

//     const next3Days = new Date(today)
//     next3Days.setDate(today.getDate() + 3)
//     next3Days.setHours(23, 59, 59, 999)

//     const next7Days = new Date(today)
//     next7Days.setDate(today.getDate() + 7)
//     next7Days.setHours(23, 59, 59, 999)

//     const [
//       totalClients,
//       activeClients,
//       expiredClients,

//       expireToday,
//       expireNext3Days,
//       expireNext7Days,

//       paidTodayAgg,
//       dueTodayAgg,
//       dueNext7DaysAgg,

//       revenueAgg
//     ] = await Promise.all([
//       prisma.client.count(),

//       prisma.client.count({
//   where: { status: ClientStatus.active }
// }),

//       prisma.client.count({
//         where: { status: ClientStatus.expired }
//       }),

//       // Expire today
// prisma.client.count({
//   where: {
//     expiryDate: {
//       gte: today,
//       lte: endOfDay
//     },
//     status: ClientStatus.active
//   }
// }),

//       // Expire in next 3 days
//       prisma.client.count({
//         where: {
//           expiryDate: {
//             gte: tomorrow,
//             lte: next3Days
//           },
//           status: ClientStatus.active
//         }
//       }),

//       // Expire in next 7 days
//       prisma.client.count({
//         where: {
//           expiryDate: {
//             gte: tomorrow,
//             lte: next7Days
//           },
//           status: ClientStatus.active
//         }
//       }),

//       // Paid today (sum of price)
//       prisma.client.aggregate({
//         _sum: { price: true },
//         where: {
//           createdAt: {
//             gte: today,
//             lte: endOfDay
//           }
//         }
//       }),

//       // Due today
//       prisma.client.aggregate({
//         _sum: { price: true },
//         where: {
//           expiryDate: {
//             gte: today,
//             lte: endOfDay
//           },
//           status: ClientStatus.active
//         }
//       }),

//       // Due next 7 days
//       prisma.client.aggregate({
//         _sum: { price: true },
//         where: {
//           expiryDate: {
//             gte: tomorrow,
//             lte: next7Days
//           },
//           status: ClientStatus.active
//         }
//       }),

//       // Total revenue
//       prisma.client.aggregate({
//         _sum: {
//           price: true
//         },
//         where: {
//           status: 'active'
//         }
//       })
//     ])

//     const totalRevenue = revenueAgg._sum.price || 0
//     const paidToday = paidTodayAgg._sum.price || 0
//     const dueToday = dueTodayAgg._sum.price || 0
//     const dueNext7Days = dueNext7DaysAgg._sum.price || 0

//     return NextResponse.json({
//       totalClients,
//       activeClients,
//       expiredClients,
//       totalRevenue,

//       // Section 1
//       totalUsers: totalClients,
//       activeUsers: activeClients,
//       expiredUsers: expiredClients,

//       // Section 2
//       expireToday,
//       expireNext3Days,
//       expireNext7Days,

//       // Section 3
//       paidToday,
//       dueToday,
//       dueNext7Days
//     })

//   } catch (error) {
//     console.error('Get dashboard stats error:', error)

//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }

// import { NextResponse } from 'next/server'
// import { getAdminFromToken } from '@/lib/jwt'
// import prisma from '@/lib/prisma'

// export async function GET(request: Request) {
//   try {
//     const admin = await getAdminFromToken(request as any)

//     if (!admin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const today = new Date()
//     today.setHours(0, 0, 0, 0) // Start of today
//     const endOfDay = new Date(today)
//     endOfDay.setHours(23, 59, 59, 999) // End of today

//     const next3Days = new Date(today)
//     next3Days.setDate(today.getDate() + 3)
//     next3Days.setHours(23, 59, 59, 999) // End of next 3 days

//     const next7Days = new Date(today)
//     next7Days.setDate(today.getDate() + 7)
//     next7Days.setHours(23, 59, 59, 999) // End of next 7 days

//     // Get total clients
//     const totalClients = await prisma.client.count()

//     // Get active clients
//     const activeClients = await prisma.client.count({
//       where: { status: 'active' }
//     })

//     // Get expired clients
//     const expiredClients = await prisma.client.count({
//       where: { status: 'expired' }
//     })

//     // Calculate total revenue (sum of prices for active clients)
//     const clients = await prisma.client.findMany({
//       where: { status: 'active' }
//     })

//     const totalRevenue = clients.reduce((sum, client) => sum + client.price, 0)

//     // User Overview
//     const totalUsers = await prisma.client.count()
//     const activeUsers = await prisma.client.count({
//       where: { status: 'active' }
//     })
//     const expiredUsers = await prisma.client.count({
//       where: { status: 'expired' }
//     })

//     // Expiration Alerts
//     const expireToday = await prisma.client.count({
//       where: {
//         expiryDate: {
//           gte: today,
//           lte: endOfDay
//         }
//       }
//     })

//     const expireNext3Days = await prisma.client.count({
//       where: {
//         expiryDate: {
//           gte: today,
//           lte: next3Days
//         },
//         status: 'active'
//       }
//     })

//     const expireNext7Days = await prisma.client.count({
//       where: {
//         expiryDate: {
//           gte: today,
//           lte: next7Days
//         },
//         status: 'active'
//       }
//     })

//     // Billing
//     const paidToday = await prisma.client.count({
//       where: {

//         createdAt: {
//           gte: today,
//           lte: endOfDay
//         }
//       }
//     })

//     const dueToday = await prisma.client.count({
//       where: {

//         expiryDate: {
//           gte: today,
//           lte: endOfDay
//         }
//       }
//     })

//     const dueNext7Days = await prisma.client.count({
//       where: {

//         expiryDate: {
//           gte: today,
//           lte: next7Days
//         }
//       }
//     })

//     return NextResponse.json({
//       totalClients,
//       activeClients,
//       expiredClients,
//       totalRevenue,

//       totalUsers,
//       activeUsers,
//       expiredUsers,

//       expireToday,
//       expireNext3Days,
//       expireNext7Days,

//       paidToday,
//       dueToday,
//       dueNext7Days
//     })
//   } catch (error) {
//     console.error('Get dashboard stats error:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// }
