
import { CreatePaymentInput, UpdatePaymentInput, PaymentFilters } from '../types';
import {
  createPayment as createPaymentRepo,
  getPaymentById as getPaymentByIdRepo,
  getPayments as getPaymentsRepo,
  updatePayment as updatePaymentRepo,
  deletePayment as deletePaymentRepo,
  getPaymentStats as getPaymentStatsRepo
} from '../repository';
import { PaymentWithClient } from '../types';


export const createPayment = async (data: CreatePaymentInput) => {
  // Validate inputs
  if (!data.clientId) {
    throw new Error('Client ID is required');
  }

  if (data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const newPayment = await createPaymentRepo(data);

  // Calculate total paid by this client across all payments
  const clientPayments = await getPaymentsRepo({ clientId: newPayment.clientId }, newPayment.companyId);
  const totalPaid = clientPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
  // Use package price if available, otherwise fall back to client price
  const packagePrice = newPayment.client?.package?.price;
  const clientPrice = newPayment.client?.price;
  const totalAmount = packagePrice ?? clientPrice ?? 0; // Package price takes precedence
  const remainingAmount = totalAmount - totalPaid;

  const paymentWithTotals = {
    ...newPayment,
    totalAmount: totalAmount,
    totalDue: totalAmount, // Total due is based on the package price
    totalPaid: totalPaid,
    remainingAmount: remainingAmount
  };

  return paymentWithTotals;
};

export const getPaymentById = async (id: string) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  return await getPaymentByIdRepo(id);
};

export const getPayments = async (admin: AdminWithPackages, filters?: PaymentFilters) => {
  const payments = await getPaymentsRepo(filters, admin.companyId);

  // Group payments by client to calculate totals efficiently
  const paymentsByClientId = payments.reduce((acc: Record<string, any[]>, payment: any) => {
    if (!acc[payment.clientId]) {
      acc[payment.clientId] = [];
    }
    acc[payment.clientId].push(payment);
    return acc;
  }, {});

  // Calculate total paid for each client
  const clientTotals = {} as Record<string, number>;
  Object.keys(paymentsByClientId).forEach(clientId => {
    clientTotals[clientId] = paymentsByClientId[clientId as any].reduce((sum: number, payment: any) => sum + payment.amount, 0);
  });

  // Add totalPaid and remainingAmount to each payment
  const paymentsWithTotals = payments.map((payment: any) => {
    const totalPaid = clientTotals[payment.clientId] || 0;
    const totalDue = payment.client?.price || 0; // Client's package price is what they owe
    const remainingAmount = totalDue - totalPaid;

    return {
      ...payment,
      totalDue: totalDue,
      totalPaid: totalPaid,
      remainingAmount: remainingAmount
    };
  });

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

  const updatedPayment = await updatePaymentRepo(id, data);

  // Calculate total paid by this client across all payments
  const clientPayments = await getPaymentsRepo({ clientId: updatedPayment.clientId }, updatedPayment.companyId);
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