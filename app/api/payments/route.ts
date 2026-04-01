import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { getClientPaymentSummary } from '@/lib/payment-calculator';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to read payments
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const method = searchParams.get('method');

    const filters = {
      clientId: clientId || undefined,
      startDate,
      endDate,
      method: method || undefined,
    };

    // Get payments with client data
    const payments = await prisma.payment.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(admin.companyId && { companyId: admin.companyId }),
        ...(startDate || endDate) && {
          paymentDate: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          }
        },
        ...(method && { method })
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            area: true, // Include area for client display
            packageId: true,
            price: true, // This is the price the client pays (might be different from package price)
            package: {
              select: {
                id: true,
                name: true,
                price: true, // This is the actual package price
              }
            }
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    // Get unique client IDs to fetch payment summaries efficiently
    const uniqueClientIds = [...new Set(payments.map(payment => payment.clientId))];

    // Fetch all payment summaries in bulk
    const paymentSummaries = await Promise.all(
      uniqueClientIds.map(clientId => getClientPaymentSummary(clientId))
    );

    // Create a map of client ID to payment summary
    const summaryMap = new Map(uniqueClientIds.map((clientId, index) => [clientId, paymentSummaries[index]]));

    // Add payment summary data to each payment using the pre-fetched summaries
    const paymentsWithSummary = payments.map(payment => {
      const summary = summaryMap.get(payment.clientId);
      return {
        ...payment,
        totalAmount: summary?.total || 0,
        totalPaid: summary?.totalPaid || 0,
        remainingAmount: summary?.remaining || 0
      };
    });

    return NextResponse.json(paymentsWithSummary);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create payments
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, amount, method, notes } = body;

    if (!clientId || !amount) {
      return NextResponse.json({ error: 'Client ID and amount are required' }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Start a transaction to ensure consistency
    const payment = await prisma.$transaction(async (tx) => {
      // First, get the client to check their total amount due
      const client = await tx.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        throw new Error('Client not found');
      }

      // Get current payment summary to prevent overpayment
      const currentSummary = await getClientPaymentSummary(clientId);

      // Calculate potential new total paid
      const potentialTotalPaid = currentSummary.totalPaid + parseFloat(amount);

      // Prevent overpayment
      if (potentialTotalPaid > client.price) {
        const maxAllowedPayment = client.price - currentSummary.totalPaid;
        if (maxAllowedPayment <= 0) {
          throw new Error('Client has already paid the full amount');
        }

        // Adjust the payment amount to prevent overpayment
        return NextResponse.json({
          error: `Payment exceeds remaining amount. Maximum allowed: ${maxAllowedPayment}`
        }, { status: 400 });
      }

      // Create the payment
      const newPayment = await tx.payment.create({
        data: {
          clientId,
          amount: parseFloat(amount),
          method: method || 'CASH',
          notes: notes || '',
          companyId: admin.companyId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              area: true, // Include area for client display
              packageId: true,
              price: true, // This is the price the client pays (might be different from package price)
              package: {
                select: {
                  id: true,
                  name: true,
                  price: true, // This is the actual package price
                }
              }
            }
          }
        }
      });

      // Recalculate payment status and update client
      const updatedSummary = await getClientPaymentSummary(clientId);

      // Update client's payment status
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: {
          paymentStatus: updatedSummary.effectivePaymentStatus
        }
      });

      // If payment status is now 'paid', extend expiry date by package duration
      if (updatedSummary.effectivePaymentStatus === 'paid') {
        const packageInfo = await tx.package.findUnique({
          where: { id: client.packageId }
        });

        if (packageInfo) {
          const newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + packageInfo.durationDays);

          await tx.client.update({
            where: { id: clientId },
            data: {
              expiryDate: newExpiryDate
            }
          });
        }
      }

      return newPayment;
    });

    // If payment was not created due to overpayment, return early
    if ('error' in payment) {
      return NextResponse.json(payment, { status: 400 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment' }, { status: 500 });
  }
}