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
      // Get invoices for a specific client
      invoices = await getInvoicesForClient(clientId, admin.companyId);
    } else {
      // Get invoices for the entire company with optional filters
      invoices = await InvoiceRepository.findByCompanyId(admin.companyId, {
        status,
        startDate,
        endDate
      });
    }

    // Add payment summaries to each invoice
    const invoicesWithPayments = await Promise.all(
      invoices.map(async (invoice) => {
        // We need to get the payment details separately since they weren't included in the repository query
        const invoiceWithPayments = await prisma.invoice.findUnique({
          where: { id: invoice.id },
          include: {
            payments: {
              orderBy: {
                paymentDate: 'desc'
              }
            }
          }
        });

        if (!invoiceWithPayments) return invoice;

        // Calculate one-time charges (part of total, not payments)
        let oneTimeChargesTotal = 0;
        if (invoiceWithPayments.additionalCharges) {
          try {
            const charges = typeof invoiceWithPayments.additionalCharges === 'string'
              ? JSON.parse(invoiceWithPayments.additionalCharges)
              : invoiceWithPayments.additionalCharges;
            if (Array.isArray(charges)) {
              oneTimeChargesTotal = charges.reduce((sum: number, charge: any) =>
                sum + (charge.amount || 0), 0
              );
            }
          } catch (error) {
            console.error('Error parsing additional charges:', error);
          }
        }

        // Total = base amount + one-time charges
        const totalAmount = invoiceWithPayments.amount + oneTimeChargesTotal;

        // Calculate payment summary (ONLY actual payments)
        const payments = invoiceWithPayments.payments;
        const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        const remaining = Math.max(totalAmount - totalPaid, 0);
        const overpaid = Math.max(totalPaid - totalAmount, 0);

        let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
        if (totalPaid >= totalAmount) {
          effectivePaymentStatus = 'paid';
        } else if (totalPaid > 0) {
          effectivePaymentStatus = 'partial';
        } else {
          effectivePaymentStatus = 'unpaid';
        }

        return {
          ...invoiceWithPayments,
          totalAmount,
          totalPaid,
          remainingAmount: remaining,
          overpaidAmount: overpaid,
          effectivePaymentStatus
        };
      })
    );

    return NextResponse.json(invoicesWithPayments);
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
    const { clientId, amount, dueDate, description, additionalCharges } = body;

    if (!clientId || !amount) {
      return NextResponse.json({ error: 'Client ID and amount are required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 });
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

    // ✅ PREVENT DUPLICATE INVOICES: Check for existing unpaid invoice
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        companyId: admin.companyId,
        status: 'unpaid'
      },
      orderBy: {
        issuedDate: 'desc'
      }
    });

    if (existingUnpaidInvoice) {
      return NextResponse.json({ 
        error: 'Client already has an unpaid invoice',
        existingInvoice: existingUnpaidInvoice
      }, { status: 409 });
    }

    // Create invoice with additional charges
    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        amount,
        dueDate: parsedDueDate,
        description: description || `Invoice for ${client.name}`,
        additionalCharges: additionalCharges || null,
        companyId: admin.companyId
      }
    });

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}