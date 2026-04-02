import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import {
  getInvoicesForClient,
  getInvoiceWithPayments,
  generateInvoiceFromClient
} from '@/modules/invoices/services';
import { InvoiceRepository } from '@/modules/invoices/repository';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoiceId = id;

    // Check if user has permission to read invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const invoice = await getInvoiceWithPayments(invoiceId, admin.companyId);

    // Verify that the invoice belongs to the admin's company
    if (invoice.companyId !== admin.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const invoiceId = id;

    const body = await request.json();
    const { amount, dueDate, description, status } = body;

    // Validate required fields
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 });
      }
    }

    // Check if invoice exists and belongs to the company
    const existingInvoice = await InvoiceRepository.findById(invoiceId, admin.companyId);
    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updatedInvoice = await InvoiceRepository.update(
      invoiceId,
      updateData,
      admin.companyId
    );

    return NextResponse.json(updatedInvoice);
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const invoiceId = id;

    // Check if invoice exists and belongs to the company
    const existingInvoice = await InvoiceRepository.findById(invoiceId, admin.companyId);
    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't allow deletion if there are payments associated with this invoice
    const paymentCount = await prisma.payment.count({
      where: { invoiceId }
    });

    if (paymentCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete invoice with associated payments'
      }, { status: 400 });
    }

    const deletedInvoice = await InvoiceRepository.delete(invoiceId, admin.companyId);

    return NextResponse.json(deletedInvoice);
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 500 });
  }
}