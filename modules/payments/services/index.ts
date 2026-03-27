
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

  return await createPaymentRepo(data);
};

export const getPaymentById = async (id: string) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  return await getPaymentByIdRepo(id);
};

export const getPayments = async (admin: AdminWithPackages, filters?: PaymentFilters) => {
  return await getPaymentsRepo(filters, admin.companyId);
};

export const updatePayment = async (id: string, data: UpdatePaymentInput) => {
  if (!id) {
    throw new Error('Payment ID is required');
  }

  // Validate amount if provided
  if (data.amount !== undefined && data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  return await updatePaymentRepo(id, data);
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