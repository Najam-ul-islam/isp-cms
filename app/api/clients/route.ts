import { NextResponse } from 'next/server'
  import { getAdminFromToken } from '@/lib/jwt'
  import prisma from '@/lib/prisma'

  export async function GET(request: Request) {
    try {
      const admin = await getAdminFromToken(request as any)

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const clients = await prisma.client.findMany({
        include: {
          package: {
            include: {
              serviceProvider: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json(clients)
    } catch (error) {
      console.error('Get clients error:', error)
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

      const {
        name,
        phone,
        cnic,
        city,
        area,
        country,
        packageId,
        price,
        startDate,
        expiryDate,
        paymentStatus,
        status,
        notes
      } = await request.json()

      // Validate required fields
      if (!name || !phone || !cnic || !city || !area || !country || !packageId || !price || !startDate || !expiryDate) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      const client = await prisma.client.create({
        data: {
          name,
          phone,
          cnic,
          city,
          area,
          country,
          packageId,
          price,
          startDate: new Date(startDate),
          expiryDate: new Date(expiryDate),
          paymentStatus,
          status,
          notes: notes || null
        }
      })

      return NextResponse.json(client, { status: 201 })
    } catch (error) {
      console.error('Create client error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }