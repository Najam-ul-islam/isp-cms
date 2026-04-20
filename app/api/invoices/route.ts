import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import {
  getInvoicesForClient,
  generateInvoiceFromClient
} from '@/modules/invoices/services';
import { InvoiceRepository } from '@/modules/invoices/repository';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to read invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const status = searchParams.get('status') as 'unpaid' | 'partial' | 'paid' | undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    let invoices;

    if (clientId) {
      // Get invoices for a specific client (includes items and payments)
      invoices = await getInvoicesForClient(clientId, admin.companyId);
      return NextResponse.json(invoices);
    }

    // Get invoices for the entire company with optional filters - SINGLE QUERY
    invoices = await prisma.invoice.findMany({
      where: {
        companyId: admin.companyId,
        ...(status && { status }),
        ...((startDate || endDate) && {
          issuedDate: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }),
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        previousInvoice: true,
      },
      orderBy: { issuedDate: 'desc' },
    });

    // Compute totals from items (SINGLE SOURCE OF TRUTH)
    const processedInvoices = invoices.map(invoice => {
      // Calculate total from items (amount * quantity for each item)
      const itemsTotal = invoice.items.reduce(
        (sum, item) => sum + (item.amount * (item.quantity || 1)),
        0
      );
      // Use items total as primary source, fall back to totalAmount/amount for legacy invoices
      const effectiveTotal = itemsTotal > 0 ? itemsTotal : (invoice.totalAmount ?? invoice.amount);
      const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = Math.max(effectiveTotal - totalPaid, 0);
      const overpaid = Math.max(totalPaid - effectiveTotal, 0);

      let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
      if (totalPaid >= effectiveTotal) {
        effectivePaymentStatus = 'paid';
      } else if (totalPaid > 0) {
        effectivePaymentStatus = 'partial';
      } else {
        effectivePaymentStatus = 'unpaid';
      }

      return {
        ...invoice,
        totalAmount: effectiveTotal,
        totalPaid,
        remainingAmount: remaining,
        overpaidAmount: overpaid,
        effectivePaymentStatus,
      };
    });

    return NextResponse.json(processedInvoices);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      clientId,
      // New items-based fields
      items,
      description,
      // Legacy fields (for backward compatibility)
      amount,
      dueDate,
      additionalCharges,
      billingMonth,
      carryForwardAmount,
      creditUsed,
      previousInvoiceId,
      // Options
      appendToExisting,
      allowDuplicate,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    // Verify client exists and belongs to the company
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found or does not belong to company' }, { status: 404 });
    }

    // Check for existing unpaid invoice
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        companyId: admin.companyId,
        status: 'unpaid'
      },
      orderBy: { issuedDate: 'desc' }
    });

    // Import service function for items-based creation
    const { createInvoiceWithItems } = await import('@/modules/invoices/services');

    // CASE 1: New items-based invoice creation
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate items
      for (const item of items) {
        if (!item.name || typeof item.amount !== 'number' || item.amount <= 0) {
          return NextResponse.json({
            error: 'Each item must have a name and a positive amount'
          }, { status: 400 });
        }
      }

      const parsedDueDate = dueDate ? new Date(dueDate) : undefined;
      if (dueDate && isNaN(parsedDueDate!.getTime())) {
        return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 });
      }

      // If client has unpaid invoice and user wants to append
      if (existingUnpaidInvoice && appendToExisting) {
        const updatedInvoice = await createInvoiceWithItems(
          {
            clientId,
            items,
            dueDate: parsedDueDate,
            description: description || `Added to invoice for ${client.name}`,
            billingMonth,
            carryForwardAmount,
            creditUsed,
            previousInvoiceId,
          },
          admin.companyId,
          { appendToExistingUnpaid: true }
        );

        return NextResponse.json({
          ...updatedInvoice,
          appendedToExisting: true,
          existingInvoiceId: existingUnpaidInvoice.id,
        });
      }

      // If client has unpaid invoice and user didn't specify append, ask them
      if (existingUnpaidInvoice && !allowDuplicate) {
        return NextResponse.json({
          error: 'Client already has an unpaid invoice',
          existingInvoice: {
            id: existingUnpaidInvoice.id,
            amount: existingUnpaidInvoice.amount,
            totalAmount: existingUnpaidInvoice.totalAmount ?? existingUnpaidInvoice.amount,
            issuedDate: existingUnpaidInvoice.issuedDate,
            status: existingUnpaidInvoice.status,
          },
          action: 'ask_user',
          message: 'Client already has an unpaid invoice. Do you want to append to it or create a new one?'
        }, { status: 409 });
      }

      // Create new invoice with items
      const invoice = await createInvoiceWithItems(
        {
          clientId,
          items,
          dueDate: parsedDueDate,
          description: description || `Invoice for ${client.name}`,
          billingMonth,
          carryForwardAmount,
          creditUsed,
          previousInvoiceId,
        },
        admin.companyId,
        { allowDuplicate: allowDuplicate }
      );

      return NextResponse.json(invoice);
    }

    // CASE 2: Legacy amount-based invoice creation (backward compatibility)
    if (!amount) {
      return NextResponse.json({ error: 'Either items array or amount is required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const parsedDueDate = dueDate ? new Date(dueDate) : new Date();
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 });
    }

    // If client has unpaid invoice and user didn't specify duplicate
    if (existingUnpaidInvoice && !allowDuplicate) {
      return NextResponse.json({
        error: 'Client already has an unpaid invoice',
        existingInvoice: {
          id: existingUnpaidInvoice.id,
          amount: existingUnpaidInvoice.amount,
          totalAmount: existingUnpaidInvoice.totalAmount ?? existingUnpaidInvoice.amount,
          issuedDate: existingUnpaidInvoice.issuedDate,
          status: existingUnpaidInvoice.status,
        },
        action: 'ask_user',
        message: 'Client already has an unpaid invoice. Do you want to append to it or create a new one?'
      }, { status: 409 });
    }

    // Create legacy-style invoice with additional charges
    const { createInvoiceForClient } = await import('@/modules/invoices/services');

    const invoice = await createInvoiceForClient(
      clientId,
      amount,
      parsedDueDate,
      admin.companyId,
      description || `Invoice for ${client.name}`,
      {
        allowDuplicate: allowDuplicate,
        billingMonth,
        carryForwardAmount,
        creditUsed,
        previousInvoiceId,
        additionalCharges,
      }
    );

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}