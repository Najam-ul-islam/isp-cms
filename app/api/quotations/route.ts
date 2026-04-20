import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { QuotationService } from '@/modules/quotations/services';
import { QuotationStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as QuotationStatus | undefined;
    const clientId = searchParams.get('clientId') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const filters = {
      status,
      clientId,
      startDate,
      endDate,
    };

    const quotations = await QuotationService.getQuotationsForCompany(admin.companyId, filters);

    return NextResponse.json(quotations);
  } catch (error: any) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, title, description, items, validUntil } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found or does not belong to company' }, { status: 404 });
    }

    const parsedValidUntil = validUntil ? new Date(validUntil) : undefined;
    if (validUntil && isNaN(parsedValidUntil!.getTime())) {
      return NextResponse.json({ error: 'Invalid validUntil date format' }, { status: 400 });
    }

    const idempotencyKey = request.headers.get('idempotency-key');

    const quotation = await QuotationService.createQuotation(
      {
        clientId,
        title,
        description,
        items,
        validUntil: parsedValidUntil,
      },
      admin.companyId,
      idempotencyKey || undefined
    );

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    console.error('Error creating quotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create quotation' }, { status: 500 });
  }
}