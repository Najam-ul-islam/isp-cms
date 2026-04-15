import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getInvoiceHistory, generateMonthlyInvoice } from '@/modules/invoices/services';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/clients/[id]/invoices
 * Returns complete invoice history for a client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Verify client exists before fetching invoices
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'unpaid' | 'partial' | 'paid' | undefined;
    const billingMonth = searchParams.get('billingMonth');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // Get invoice history
    const result = await getInvoiceHistory(clientId, admin.companyId, {
      status,
      billingMonth: billingMonth || undefined,
      limit,
      offset
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching invoice history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoice history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients/[id]/invoices/generate
 * Generate a new monthly invoice for a client
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (only ADMIN and SUPER_ADMIN can create invoices)
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const body = await request.json();
    const { billingMonth, applyCredits = true, carryForward = true } = body;

    if (!billingMonth) {
      return NextResponse.json(
        { error: 'billingMonth is required (format: "2026-04")' },
        { status: 400 }
      );
    }

    // Validate billing month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(billingMonth)) {
      return NextResponse.json(
        { error: 'billingMonth must be in format YYYY-MM (e.g., "2026-04")' },
        { status: 400 }
      );
    }

    // Generate the invoice
    const invoice = await generateMonthlyInvoice(clientId, admin.companyId, billingMonth, {
      applyCredits,
      carryForward
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this month or client skipped' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
