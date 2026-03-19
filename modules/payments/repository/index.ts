import prisma from '@/lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput, PaymentFilters, PaymentWithClient } from '../types';

export const createPayment = async (data: CreatePaymentInput) => {
  return await prisma.payment.create({
    data: {
      clientId: data.clientId,
      amount: data.amount,
      method: data.method || 'cash',
      notes: data.notes || '',
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    }
  });
};

export const getPaymentById = async (id: string) => {
  return await prisma.payment.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    }
  });
};

export const getPayments = async (filters?: PaymentFilters) => {
  const whereClause: any = {};

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  }

  if (filters?.startDate && filters?.endDate) {
    whereClause.paymentDate = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  } else if (filters?.startDate) {
    whereClause.paymentDate = {
      gte: filters.startDate,
    };
  } else if (filters?.endDate) {
    whereClause.paymentDate = {
      lte: filters.endDate,
    };
  }

  if (filters?.method) {
    whereClause.method = filters.method;
  }

  return await prisma.payment.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    },
    orderBy: {
      paymentDate: 'desc',
    }
  });
};

export const updatePayment = async (id: string, data: UpdatePaymentInput) => {
  const { amount, method, notes } = data;
  return await prisma.payment.update({
    where: { id },
    data: {
      ...(amount !== undefined && { amount }),
      ...(method !== undefined && { method }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    }
  });
};

export const deletePayment = async (id: string) => {
  return await prisma.payment.delete({
    where: { id }
  });
};

export const getPaymentStats = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = {};

  if (startDate && endDate) {
    whereClause.paymentDate = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    whereClause.paymentDate = {
      gte: startDate,
    };
  } else if (endDate) {
    whereClause.paymentDate = {
      lte: endDate,
    };
  }

  return await prisma.payment.aggregate({
    where: whereClause,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });
};