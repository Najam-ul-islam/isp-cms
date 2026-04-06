import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, additionalCharges } = body;

    if (!invoiceId || !additionalCharges) {
      return NextResponse.json(
        { error: 'Invoice ID and additional charges are required' },
        { status: 400 }
      );
    }

    // Verify invoice exists and belongs to the company
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Update invoice with additional charges
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        additionalCharges: additionalCharges
      }
    });

    return NextResponse.json(updatedInvoice);
  } catch (error: any) {
    console.error('Error updating invoice additional charges:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
