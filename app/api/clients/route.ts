import  prisma  from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { getClientsWithFilters } from '../../../modules/clients/services'
import { ClientStatus, PaymentStatus } from '@prisma/client'

function parseClientStatus(value: string | null): ClientStatus | undefined {
  if (!value) return undefined;

  // Explicitly check against each possible ClientStatus value
  if (value === 'active' || value === 'inactive' || value === 'pending' || value === 'expired') {
    return value as ClientStatus;
  }
  return undefined;
}

function parsePaymentStatus(value: string | null): PaymentStatus | undefined {
  if (!value) return undefined;

  // Explicitly check against each possible PaymentStatus value
  if (value === 'paid' || value === 'unpaid' || value === 'partial' || value === 'overdue') {
    return value as PaymentStatus;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      status: parseClientStatus(searchParams.get('status')),
      paymentStatus: parsePaymentStatus(searchParams.get('paymentStatus')),
      expiring: searchParams.get('expiring') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined
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
      paymentStatus: rawPaymentStatus,
      status: rawStatus,
      notes
    } = await request.json()

    // Validate required fields
    if (!name || !phone || !cnic || !city || !area || !country || !packageId || !price || !startDate || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate status and paymentStatus
    const status = parseClientStatus(rawStatus);
    const paymentStatus = parsePaymentStatus(rawPaymentStatus);

    if (rawStatus && !status) {
      return NextResponse.json(
        { error: `Invalid status value. Valid values are: ${Object.values(ClientStatus).join(', ')}` },
        { status: 400 }
      );
    }

    if (rawPaymentStatus && !paymentStatus) {
      return NextResponse.json(
        { error: `Invalid paymentStatus value. Valid values are: ${Object.values(PaymentStatus).join(', ')}` },
        { status: 400 }
      );
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

    const clientData: any = {
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
      notes: notes || null
    };

    // Only add optional fields if they are defined
    if (status !== undefined) {
      clientData.status = status;
    }
    if (paymentStatus !== undefined) {
      clientData.paymentStatus = paymentStatus;
    }

    const client = await prisma.client.create({
      data: clientData
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



