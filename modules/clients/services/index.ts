import {prisma} from '@/lib/prisma';
import { ClientStatus, PaymentStatus } from '@prisma/client';
import { AdminWithPackages } from '@/lib/jwt';
import { logAction } from '../../audit/services';

export type ClientFilters = {
  status?: ClientStatus;
  paymentStatus?: PaymentStatus;
  expiring?: boolean;
  search?: string;
};

export const getClientsWithFilters = async (admin: AdminWithPackages, filters?: ClientFilters) => {
  const whereClause: any = {
    companyId: admin.companyId  // Multi-tenant filter
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.paymentStatus) {
    whereClause.paymentStatus = filters.paymentStatus;
  }

  if (filters?.expiring) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);

    whereClause.expiryDate = {
      gte: today,
      lte: next7Days
    };
    whereClause.status = ClientStatus.active;
  }

  if (filters?.search) {
    whereClause.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { cnic: { contains: filters.search, mode: 'insensitive' } },
      { city: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      package: {
        include: {
          serviceProvider: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Calculate total paid amount for each client
  const clientsWithPaymentData = await Promise.all(
    clients.map(async (client) => {
      // Get all payments for this client
      const payments = await prisma.payment.findMany({
        where: {
          clientId: client.id
        }
      });

      // Calculate total paid amount
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate remaining amount
      const totalDue = client.price;
      const remainingAmount = totalDue - totalPaid;

      // Determine the effective payment status based on actual payments
      let effectivePaymentStatus = client.paymentStatus;
      if (totalPaid > 0 && totalPaid < totalDue) {
        effectivePaymentStatus = 'partial';
      } else if (totalPaid >= totalDue) {
        effectivePaymentStatus = 'paid';
      } else if (totalPaid === 0) {
        effectivePaymentStatus = 'unpaid';
      }

      return {
        ...client,
        _count: {
          payments: payments.length
        },
        totalPaid: totalPaid,
        remainingAmount: remainingAmount,
        effectivePaymentStatus: effectivePaymentStatus
      };
    })
  );

  return clientsWithPaymentData;
};

export const getClientStats = async (admin: AdminWithPackages, filters?: ClientFilters) => {
  const whereClause: any = {
    companyId: admin.companyId  // Multi-tenant filter
  };

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  if (filters?.paymentStatus) {
    whereClause.paymentStatus = filters.paymentStatus;
  }

  const count = await prisma.client.count({
    where: whereClause
  });

  return { count };
};

export const getRecentClients = async (admin: AdminWithPackages, limit: number = 5) => {
  return await prisma.client.findMany({
    where: {
      companyId: admin.companyId  // Multi-tenant filter
    },
    take: limit,
    include: {
      package: {
        include: {
          serviceProvider: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};