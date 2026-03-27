import {prisma} from '@/lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput, PaymentFilters, PaymentWithClient } from '../types';
import { Prisma } from '@prisma/client';

export const createPayment = async (data: CreatePaymentInput) => {
  return await prisma.payment.create({
    data: {
      clientId: data.clientId,
      amount: data.amount,
      method: data.method || 'CASH',
      notes: data.notes || '',
      companyId: data.companyId
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

export const getPayments = async (filters?: PaymentFilters, companyId?: string) => {
  const whereClause: Prisma.PaymentWhereInput = {
    ...(companyId && { client: { companyId } })
  };

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  }

  if (filters?.startDate || filters?.endDate) {
    whereClause.paymentDate = {
      ...(filters.startDate && { gte: filters.startDate }),
      ...(filters.endDate && { lte: filters.endDate }),
    };
  }

  if (filters?.method) {
    whereClause.method = filters.method;
  }

  // ✅ FIXED ORDER BY (clean & type-safe)
  const orderByClause: Prisma.PaymentOrderByWithRelationInput =
    filters?.sortBy
      ? { [filters.sortBy]: filters.sortOrder || 'desc' }
      : { paymentDate: 'desc' };

  // ✅ Typed query options (NO any)
  const queryOptions: Prisma.PaymentFindManyArgs = {
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
    orderBy: orderByClause,
    ...(filters?.limit && { take: filters.limit }),
  };

  return await prisma.payment.findMany(queryOptions);
};

// export const getPayments = async (filters?: PaymentFilters) => {
//   // const whereClause: any = {};
//   const whereClause: Prisma.PaymentWhereInput = {};

//   if (filters?.clientId) {
//     whereClause.clientId = filters.clientId;
//   }

//   if (filters?.startDate && filters?.endDate) {
//     whereClause.paymentDate = {
//       gte: filters.startDate,
//       lte: filters.endDate,
//     };
//   } else if (filters?.startDate) {
//     whereClause.paymentDate = {
//       gte: filters.startDate,
//     };
//   } else if (filters?.endDate) {
//     whereClause.paymentDate = {
//       lte: filters.endDate,
//     };
//   }

//   if (filters?.method) {
//     whereClause.method = filters.method;
//   }

//   // const orderByClause: any = {};
//   // const orderByClause: Prisma.PaymentOrderByWithRelationInput = {};
//   // if (filters?.sortBy) {
//   //   orderByClause[filters.sortBy] = filters.sortOrder || 'desc';
//   const orderByClause: Prisma.PaymentOrderByWithRelationInput =
//   filters?.sortBy
//     ? { [filters.sortBy]: filters.sortOrder || 'desc' }
//     : { paymentDate: 'desc' };
//   } else {
//     orderByClause.paymentDate = 'desc';
//   }

//   const queryOptions: any = {
//     where: whereClause,
//     include: {
//       client: {
//         select: {
//           id: true,
//           name: true,
//           phone: true,
//         }
//       }
//     },
//     orderBy: orderByClause
//   };

//   if (filters?.limit) {
//     queryOptions.take = filters.limit;
//   }

//   return await prisma.payment.findMany(queryOptions);
// };

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

export const getPaymentStats = async (companyId: string, startDate?: Date, endDate?: Date) => {
  const whereClause: any = {
    client: {
      companyId
    }
  };

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