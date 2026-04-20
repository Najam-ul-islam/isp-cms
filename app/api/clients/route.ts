import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { getClientsWithFilters } from '../../../modules/clients/services'
import { AdminWithPackages } from '@/lib/jwt'
import { ClientStatus, PaymentStatus } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { logAction } from '../../../modules/audit/services'
import { emitEvent } from '@/lib/sse-service'

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

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to read clients
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url);

    const filters = {
      status: parseClientStatus(searchParams.get('status')),
      paymentStatus: parsePaymentStatus(searchParams.get('paymentStatus')),
      expiring: searchParams.get('expiring') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined
    };

    const clients = await getClientsWithFilters(admin, filters);

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
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create clients
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const {
      name,
      username,
      phone,
      cnic,
      city,
      area,
      areaId,
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
    if (!name || !phone || !cnic || !city || !country || !packageId || !price || !startDate || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

     // Validate username uniqueness if provided
     if (username) {
       const existingUsername = await prisma.client.findUnique({
         where: { username_companyId: { username, companyId: admin.companyId } }
       });
       if (existingUsername) {
         return NextResponse.json(
           { error: 'Username already exists' },
           { status: 400 }
         );
       }
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

    // Parse dates safely - treat as date-only (YYYY-MM-DD) to avoid timezone issues
    // Convert to UTC Date to avoid timezone shifts
    const parseDateOnly = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      // Parse YYYY-MM-DD as UTC date to avoid timezone shifts
      const [year, month, day] = dateStr.split('-');
      if (!year || !month || !day) return null;
      // Create UTC date - this ensures consistent storage regardless of timezone
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    };

    let parsedStartDate: Date | null;
    let parsedExpiryDate: Date | null;

    try {
      parsedStartDate = parseDateOnly(startDate);
      if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }

      parsedExpiryDate = parseDateOnly(expiryDate);
      if (!parsedExpiryDate || isNaN(parsedExpiryDate.getTime())) {
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

    // Verify that the package exists
    const packageExists = await prisma.package.findUnique({
      where: { id: packageId }
    });

    if (!packageExists) {
      return NextResponse.json(
        { error: 'Selected package does not exist' },
        { status: 400 }
      );
    }

    // Check if the area exists, and create it if it doesn't exist (backward compatibility)
    // If areaId is provided, verify it exists
    let finalAreaId = areaId || null;
    let finalAreaName = area || null;

    if (finalAreaId) {
      // Verify the area exists and belongs to the admin's company
      const areaExists = await prisma.area.findFirst({
        where: {
          id: finalAreaId,
          companyId: admin.companyId
        }
      });

      if (!areaExists) {
        return NextResponse.json(
          { error: 'Selected area does not exist' },
          { status: 400 }
        );
      }
      finalAreaName = areaExists.name;
    } else if (finalAreaName && finalAreaName.trim()) {
      // Backward compatibility: If area name is provided instead of areaId
      let areaExists = await prisma.area.findFirst({
        where: {
          companyId: admin.companyId,
          name: {
            equals: finalAreaName.trim(),
            mode: 'insensitive'
          }
        }
      });

      if (!areaExists) {
        // Create the new area since it doesn't exist
        areaExists = await prisma.area.create({
          data: {
            name: finalAreaName.trim(),
            description: `${finalAreaName.trim()} area created automatically`,
            companyId: admin.companyId
          }
        });
      }
      finalAreaId = areaExists.id;
      finalAreaName = areaExists.name;
    }

    const clientData: any = {
      name,
      username: username || null,
      phone,
      cnic,
      city,
      areaName: finalAreaName,
      areaId: finalAreaId,
      country,
      packageId,
      price,
      startDate: parsedStartDate,
      expiryDate: parsedExpiryDate,
      notes: notes || null,
      companyId: admin.companyId,  // Multi-tenant association
      createdBy: admin.id  // Associate client with the admin creating it
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

    // Log the client creation
    await logAction({
      userId: admin.id,
      action: 'CREATE_CLIENT',
      entity: 'CLIENT',
      entityId: client.id,
      metadata: {
        clientName: client.name,
        clientPhone: client.phone,
        packageName: client.packageId
      },
      companyId: admin.companyId
    });

    // Emit real-time event for client creation
    try {
      await emitEvent('client_created', {
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        areaName: client.areaName,
        areaId: client.areaId,
        packageId: client.packageId,
        price: client.price,
      });
    } catch (sseError) {
      console.error('SSE event emission failed:', sseError);
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)

    // Handle Prisma unique constraint error (duplicate CNIC or phone)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Find which field caused the conflict
        const target = (error.meta as any)?.target as string | string[];
        if (Array.isArray(target)) {
          if (target.includes('cnic')) {
            return NextResponse.json(
              { error: 'A client with this CNIC already exists' },
              { status: 400 }
            );
          } else if (target.includes('phone')) {
            return NextResponse.json(
              { error: 'A client with this phone number already exists' },
              { status: 400 }
            );
          } else {
            return NextResponse.json(
              { error: `A client with this ${target.join(' or ')} already exists` },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: `A client with this ${target} already exists` },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



