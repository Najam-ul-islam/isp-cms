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