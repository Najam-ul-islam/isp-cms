import { NextResponse } from 'next/server'
  import { getAdminFromToken } from '@/lib/jwt'
  import prisma from '@/lib/prisma'

  export async function GET(request: Request) {
    try {
      const admin = await getAdminFromToken(request as any)

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const packages = await prisma.package.findMany({
        include: {
          serviceProvider: true  // Include service provider information
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json(packages)
    } catch (error) {
      console.error('Get packages error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  export async function POST(request: Request) {
    try {
      const admin = await getAdminFromToken(request as any)

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { name, speed, price, purchasePrice, durationDays, serviceProviderId } = await request.json()

      // Validate required fields
      if (!name || !speed || !price || !durationDays) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const pkg = await prisma.package.create({
        data: {
          name,
          speed,
          price,
          purchasePrice: purchasePrice || 0, // Default to 0 if not provided
          durationDays,
          serviceProviderId: serviceProviderId || null, // Connect to service provider if provided
          createdBy: admin.id  // Use the authenticated admin's ID as the creator
        }
      })

      return NextResponse.json(pkg, { status: 201 })
    } catch (error) {
      console.error('Create package error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }