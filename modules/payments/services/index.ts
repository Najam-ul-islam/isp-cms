
import { CreatePaymentInput, UpdatePaymentInput, PaymentFilters } from '../types';
import {
  getPaymentById as getPaymentByIdRepo,
  getPayments as getPaymentsRepo,
  updatePayment as updatePaymentRepo,
  deletePayment as deletePaymentRepo,
  getPaymentStats as getPaymentStatsRepo
} from '../repository';
import { PaymentWithClient } from '../types';
import { prisma } from '@/lib/prisma';
import { getClientPaymentSummary } from '@/lib/payment-calculator';

export const getPaymentById = async (id: string) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  return await getPaymentByIdRepo(id);
};

export const getPayments = async (admin: AdminWithPackages, filters?: PaymentFilters) => {
  const payments = await getPaymentsRepo(filters, admin.companyId);

  // Add payment summary data to each payment
  const paymentsWithTotals = await Promise.all(
    payments.map(async (payment: any) => {
      const summary = await getClientPaymentSummary(payment.clientId);
      return {
        ...payment,
        totalDue: summary.total,
        totalPaid: summary.totalPaid,
        remainingAmount: summary.remainingAmount
      };
    })
  );

  return paymentsWithTotals;
};

export const updatePayment = async (id: string, data: UpdatePaymentInput) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  // Validate amount if provided
  if (data.amount !== undefined && data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  // Use transaction to ensure consistency
  const updatedPayment = await prisma.$transaction(async (tx) => {
    // Update the payment record
    const updatedPayment = await tx.payment.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.method !== undefined && { method: data.method }),
        ...(data.notes !== undefined && { notes: data.notes }),
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
    if (!updatedPayment.clientId) throw new Error("Payment must have a clientId");
    const updatedSummary = await getClientPaymentSummary(updatedPayment.clientId);

    // Update client's payment status
    await tx.client.update({
      where: { id: updatedPayment.clientId },
      data: {
        paymentStatus: updatedSummary.effectivePaymentStatus
      }
    });

    // If payment status is now 'paid', extend expiry date by package duration
    if (updatedSummary.effectivePaymentStatus === 'paid' && updatedPayment.client) {
      const packageInfo = await tx.package.findUnique({
        where: { id: updatedPayment.client.packageId }
      });

      if (packageInfo) {
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + packageInfo.durationDays);

        await tx.client.update({
          where: { id: updatedPayment.clientId },
          data: {
            expiryDate: newExpiryDate
          }
        });
      }
    }

    return updatedPayment;
  });

  // Calculate totals for response
  const clientPayments = await getPaymentsRepo({ clientId: updatedPayment.clientId || undefined }, updatedPayment.companyId);
  const totalPaid = clientPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalDue = updatedPayment.client?.price || 0; // Client's package price is what they owe
  const remainingAmount = totalDue - totalPaid;

  const paymentWithTotals = {
    ...updatedPayment,
    totalDue: totalDue,
    totalPaid: totalPaid,
    remainingAmount: remainingAmount
  };

  return paymentWithTotals;
};

export const deletePayment = async (id: string) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  return await deletePaymentRepo(id);
};

export const getPaymentStats = async (companyId: string, startDate?: Date, endDate?: Date) => {
  return await getPaymentStatsRepo(companyId, startDate, endDate);
};



import { AdminWithPackages } from '@/lib/jwt';

// export const getRecentPayments = async (limit: number = 5): Promise<PaymentWithClient[]> => {
//   return await getPaymentsRepo({ limit, sortBy: 'createdAt', sortOrder: 'desc' });
// };
export const getRecentPayments = async (
  admin: AdminWithPackages,
  limit: number = 5
): Promise<PaymentWithClient[]> => {
  // ✅ Now this works because getPaymentsRepo returns PaymentWithClient[]
  const payments = await getPaymentsRepo({
    limit,
    sortBy: 'paymentDate',
    sortOrder: 'desc'
  }, admin.companyId);

  // Type assertion to satisfy TypeScript compiler
  return payments as PaymentWithClient[];
};