import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getClientPaymentSummary, getClientInvoicesWithPayments } from '@/lib/payment-calculator'
import { logAction } from '../../../../modules/audit/services'

export const dynamic = 'force-dynamic'

// GET single client with package info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      },
      include: {
        package: {
          include: {
            serviceProvider: true
          }
        }
      }
    })

    // Calculate payment summary using the utility function
    const paymentSummary = await getClientPaymentSummary(clientId);

    // Get all payments for this client ordered by date (most recent first)
    const allClientPayments = await prisma.payment.findMany({
      where: {
        clientId: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      },
      orderBy: {
        paymentDate: 'desc' // Order by payment date descending to get latest first
      }
    });

    // Get all invoices with payment details for this client
    const clientInvoices = await getClientInvoicesWithPayments(clientId);

    // Get the latest payment date if payments exist
    const latestPaymentDate = allClientPayments.length > 0 ? allClientPayments[0].paymentDate : null;

    // Combine client data with calculated payment stats
    const clientWithPaymentStats = {
      ...client,
      totalPaid: paymentSummary.totalPaid,
      remainingAmount: paymentSummary.remainingAmount,
      overpaidAmount: paymentSummary.overpaidAmount,
      totalAmount: paymentSummary.total,
      effectivePaymentStatus: paymentSummary.effectivePaymentStatus,
      latestPaymentDate,
      payments: allClientPayments, // Include payment history
      invoices: clientInvoices // Include invoice details with payment summaries
    };

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(clientWithPaymentStats)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UPDATE client
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

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

    // Verify that the package exists if packageId is provided
    if (packageId) {
      const packageExists = await prisma.package.findUnique({
        where: { id: packageId }
      });

      if (!packageExists) {
        return NextResponse.json(
          { error: 'Selected package does not exist' },
          { status: 400 }
        );
      }
    }

    // Check if the area exists, and create it if it doesn't exist (only if area is provided)
    if (area) {
      let areaExists = await prisma.area.findUnique({
        where: { name: area }
      });

      if (!areaExists) {
        // Create the new area since it doesn't exist
        areaExists = await prisma.area.create({
          data: {
            name: area,
            description: `${area} area created automatically`,
            companyId: admin.companyId
          }
        });
      }
    }

    // Parse dates safely
    let parsedStartDate: Date | undefined;
    let parsedExpiryDate: Date | undefined;

    if (startDate) {
      try {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid start date format' },
            { status: 400 }
          );
        }
      } catch (dateError) {
        return NextResponse.json(
          { error: 'Invalid start date format' },
          { status: 400 }
        );
      }
    }

    if (expiryDate) {
      try {
        parsedExpiryDate = new Date(expiryDate);
        if (isNaN(parsedExpiryDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid expiry date format' },
            { status: 400 }
          );
        }
      } catch (dateError) {
        return NextResponse.json(
          { error: 'Invalid expiry date format' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      name,
      phone,
      cnic,
      city,
      country,
      price: typeof price === 'string' ? parseFloat(price) : price,
      paymentStatus,
      status,
      notes: notes || null
    };

    // Only add dates if they were provided
    if (parsedStartDate) {
      updateData.startDate = parsedStartDate;
    }
    if (parsedExpiryDate) {
      updateData.expiryDate = parsedExpiryDate;
    }

    // Only update packageId if it was provided
    if (packageId) {
      updateData.packageId = packageId;
    }

    // Only update area if it was provided
    if (area) {
      updateData.area = area;
    }

    // Get the original client to include in audit log
    const originalClient = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      }
    });

    const updatedClient = await prisma.client.update({
      where: {
        id: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      },
      data: updateData
    })

    // Log the client update
    await logAction({
      userId: admin.id,
      action: 'UPDATE_CLIENT',
      entity: 'CLIENT',
      entityId: updatedClient.id,
      metadata: {
        originalData: originalClient,
        updatedFields: Object.keys(updateData),
        clientName: updatedClient.name
      },
      companyId: admin.companyId
    });

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE client
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const clientId = id

    // Delete related payments first to avoid foreign key constraint
    await prisma.payment.deleteMany({
      where: {
        clientId,
        companyId: admin.companyId  // Multi-tenant filter
      }
    });

    // Get the client before deletion for audit log
    const clientToDelete = await prisma.client.findUnique({
      where: {
        id: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      }
    });

    // Then delete the client
    await prisma.client.delete({
      where: {
        id: clientId,
        companyId: admin.companyId  // Multi-tenant filter
      }
    })

    // Log the client deletion
    await logAction({
      userId: admin.id,
      action: 'DELETE_CLIENT',
      entity: 'CLIENT',
      entityId: clientId,
      metadata: {
        clientName: clientToDelete?.name,
        clientPhone: clientToDelete?.phone
      },
      companyId: admin.companyId
    });

    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Delete client error:', error)

    // Check if it's a foreign key constraint error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete client: related payments exist. Please delete related payments first.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
