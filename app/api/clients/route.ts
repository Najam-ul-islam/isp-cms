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

      // Parse dates safely
      let parsedStartDate: Date;
      let parsedExpiryDate: Date;

      try {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid start date format' },
            { status: 400 }
          );
        }

        parsedExpiryDate = new Date(expiryDate);
        if (isNaN(parsedExpiryDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expiry date format' },
            { status: 400 }
          );
        }
      } catch (dateError) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
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
          startDate: parsedStartDate,
          expiryDate: parsedExpiryDate,
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