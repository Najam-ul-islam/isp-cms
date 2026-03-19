import { NextRequest, NextResponse } from 'next/server'
  import { getAdminFromToken } from '@/lib/jwt'
  import { getClientsWithFilters } from '../../../modules/clients/services'

  export async function GET(request: NextRequest) {
    try {
      const admin = await getAdminFromToken(request as any)

      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const paymentStatus = searchParams.get('paymentStatus');
      const expiring = searchParams.get('expiring');
      const search = searchParams.get('search');

      const filters = {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        expiring: expiring === 'true' ? true : undefined,
        search: search || undefined
      };

      const clients = await getClientsWithFilters(filters);

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