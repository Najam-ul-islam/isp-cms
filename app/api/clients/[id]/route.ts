import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getInvoicesForClient } from '@/modules/invoices/services'
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

       // Check if client exists before proceeding
       if (!client) {
         return NextResponse.json({ error: 'Client not found' }, { status: 404 })
       }

    // Check if this is a lightweight request (for payment forms, dropdowns, etc.)
    const { searchParams } = new URL(request.url);
    const light = searchParams.get('light') === 'true';

    if (light) {
      // Lightweight version - just return basic client info with summary
      const outstandingInvoices = await prisma.invoice.findMany({
        where: {
          clientId,
          companyId: admin.companyId,
          status: { in: ['unpaid', 'partial'] }
        },
        include: {
          payments: true
        }
      });

      // Compute totals from invoices and their payments
      let totalAmount = 0;
      let totalPaid = 0;
      let remainingAmount = 0;

      for (const inv of outstandingInvoices) {
        const invTotal = inv.totalAmount ?? inv.amount ?? 0;
        const invPaid = inv.payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const invRemaining = Math.max(invTotal - invPaid, 0);
        
        totalAmount += invTotal;
        totalPaid += invPaid;
        remainingAmount += invRemaining;
      }

      return NextResponse.json({
        ...client,
        totalAmount,
        totalPaid,
        remainingAmount,
        packageAmount: client?.price || 0,
        otherIncome: 0,
        effectivePaymentStatus: remainingAmount <= 0.01 ? "paid" : totalPaid > 0 ? "partial" : "unpaid"
      });
    }

    // Full version - all data (for client details page)
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

    // Get all invoices with correctly computed payment summaries
    const invoicesWithAmounts = await getInvoicesForClient(clientId, admin.companyId);

    // Get the latest payment date if payments exist
    const latestPaymentDate = allClientPayments.length > 0 ? allClientPayments[0].paymentDate : null;

    // Filter to only outstanding invoices (exclude fully paid)
    const outstandingInvoices = invoicesWithAmounts.filter(inv => inv.effectivePaymentStatus !== "paid");

    // Calculate totals from outstanding invoices only
    const totalAmount     = outstandingInvoices.reduce((sum, inv) => sum + ((inv.totalAmount ?? inv.amount ?? 0) || 0), 0);
    const totalPaid       = outstandingInvoices.reduce((sum, inv) => sum + ((inv.totalPaid ?? 0) || 0), 0);
    const remainingAmount = outstandingInvoices.reduce((sum, inv) => sum + ((inv.remainingAmount ?? 0) || 0), 0);

    // Combine client data with calculated payment stats
    const clientWithPaymentStats = {
      ...client,
      totalPaid,
      remainingAmount,
      overpaidAmount: 0,
      totalAmount,
      effectivePaymentStatus: remainingAmount <= 0.01 ? "paid" : totalPaid > 0 ? "partial" : "unpaid",
      packageAmount: client?.price || 0,
      otherIncome: 0,
      latestPaymentDate,
      payments: allClientPayments,
      invoices: invoicesWithAmounts,
    };

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
      paymentStatus,
      status,
      notes
    } = await request.json()

     // Validate username uniqueness if provided and different from current
     if (username) {
       const currentClient = await prisma.client.findUnique({
         where: { id: clientId }
       });
       
       if (currentClient && currentClient.username !== username) {
         const existingUsername = await prisma.client.findUnique({
           where: { username_companyId: { username, companyId: currentClient.companyId } }
         });
         if (existingUsername) {
           return NextResponse.json(
             { error: 'Username already exists' },
             { status: 400 }
           );
         }
       }
     }

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

    // Handle area assignment - accept either areaId or area name (for backward compatibility)
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

    // Parse dates safely - treat as date-only (YYYY-MM-DD) to avoid timezone issues
    // Convert to UTC Date to avoid timezone shifts
    const parseDateOnly = (dateStr: string | null | undefined): Date | undefined => {
      if (!dateStr) return undefined;
      // Parse YYYY-MM-DD as UTC date to avoid timezone shifts
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length !== 3) return undefined;
      const [year, month, day] = parts;
      if (!year || !month || !day) return undefined;
      // Create UTC date at noon - this ensures consistent storage regardless of timezone
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    };

    let parsedStartDate: Date | undefined;
    let parsedExpiryDate: Date | undefined;

    if (startDate) {
      try {
        parsedStartDate = parseDateOnly(startDate);
        if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
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
        parsedExpiryDate = parseDateOnly(expiryDate);
        if (!parsedExpiryDate || isNaN(parsedExpiryDate.getTime())) {
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
      username: username || null,
      phone,
      cnic,
      city,
      country,
      areaName: finalAreaName,
      areaId: finalAreaId,
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

    // Delete related complaints first
    await prisma.complaint.deleteMany({
      where: {
        clientId,
        companyId: admin.companyId
      }
    });

    // Delete related product sales
    await prisma.productSale.deleteMany({
      where: {
        clientId,
        companyId: admin.companyId
      }
    });

    // Delete related payments to avoid foreign key constraint
    await prisma.payment.deleteMany({
      where: {
        clientId,
        companyId: admin.companyId
      }
    });

    // Delete related invoices to avoid foreign key constraint
    await prisma.invoice.deleteMany({
      where: {
        clientId,
        companyId: admin.companyId
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
