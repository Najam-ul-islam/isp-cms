import {prisma} from '@/lib/prisma';
import { CreatePaymentInput, UpdatePaymentInput, PaymentFilters, PaymentWithClient } from '../types';
import { Prisma } from '@prisma/client';

export const createPayment = async (data: CreatePaymentInput) => {
  return await prisma.payment.create({
    data: {
      clientId: data.clientId,
      invoiceId: data.invoiceId,
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
};

export const getPayments = async (filters?: PaymentFilters, companyId?: string) => {
  const whereClause: Prisma.PaymentWhereInput = {
    ...(companyId && { client: { companyId } })
  };

  if (filters?.clientId && typeof filters.clientId === 'string') {
    whereClause.clientId = filters.clientId;
  }

  if (filters?.startDate || filters?.endDate) {
    whereClause.paymentDate = {
      ...(filters.startDate && { gte: new Date(filters.startDate) }),
      ...(filters.endDate && { lte: new Date(filters.endDate) }),
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
          email: true,
          area: true, // Include area for client display
          package: {
            select: {
              name: true,
            }
          },
          price: true,
        },
      },
    },
    orderBy: orderByClause,
    ...(filters?.limit && { take: filters.limit }),
  };

  return await prisma.payment.findMany(queryOptions);
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

// New function to get payments grouped by date for charts
export const getPaymentsGroupedByDate = async (companyId: string, startDate?: Date, endDate?: Date) => {
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

  // Group payments by date and aggregate
  const payments = await prisma.$queryRaw<Array<{
    date: Date;
    amount: number;
    count: number;
  }>>`
    SELECT
      DATE("paymentDate") as date,
      SUM("amount") as amount,
      COUNT(*) as count
    FROM "Payment"
    WHERE "companyId" = ${companyId}
    ${startDate && endDate ? Prisma.sql`AND "paymentDate" BETWEEN ${startDate} AND ${endDate}` : Prisma.empty}
    GROUP BY DATE("paymentDate")
    ORDER BY DATE("paymentDate")
  `;

  return payments;
};