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
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
      }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Calculate total additional charges
    const chargesArray = Array.isArray(additionalCharges) 
      ? additionalCharges 
      : typeof additionalCharges === 'string' 
        ? JSON.parse(additionalCharges) 
        : [];
    
    const totalAdditionalCharges = chargesArray.reduce(
      (sum: number, charge: any) => sum + (charge.amount || 0),
      0
    );

    if (totalAdditionalCharges <= 0) {
      return NextResponse.json(
        { error: 'Additional charges must be greater than 0' },
        { status: 400 }
      );
    }

    // ✅ CREATE NEW INVOICE for additional charges instead of updating existing one
    const newInvoice = await prisma.invoice.create({
      data: {
        clientId: existingInvoice.clientId,
        companyId: existingInvoice.companyId,
        amount: totalAdditionalCharges,
        description: `Additional charges: ${chargesArray.map((c: any) => c.name).join(', ')}`,
        additionalCharges: chargesArray,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'unpaid',
        billingMonth: existingInvoice.billingMonth,
        previousInvoiceId: invoiceId, // Link to original invoice for tracking
        carryForwardAmount: 0,
        creditUsed: 0,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        }
      }
    });

    console.log(`✅ Created new invoice #${newInvoice.id.slice(-8).toUpperCase()} for additional charges: Rs. ${totalAdditionalCharges}`);

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating additional charges invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create additional charges invoice' },
      { status: 500 }
    );
  }
}
