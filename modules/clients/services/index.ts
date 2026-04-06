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

  // Fetch all payment data in a single query to avoid N+1 problem
  if (clients.length > 0) {
    const clientIds = clients.map(client => client.id);

    // Get all payments for the clients in a single query
    const allPayments = await prisma.payment.findMany({
      where: {
        clientId: { in: clientIds }
      }
    });

    // Group payments by client ID
    const paymentGroups = allPayments.reduce((acc, payment) => {
      if (!payment.clientId) return acc; // Skip payments without clientId
      if (!acc[payment.clientId]) {
        acc[payment.clientId] = [];
      }
      acc[payment.clientId].push(payment);
      return acc;
    }, {} as Record<string, typeof allPayments>);

    // Create a map of client ID to their payment data
    const paymentMap = new Map(
      Object.entries(paymentGroups).map(([clientId, payments]) => [
        clientId,
        {
          totalPaid: payments.reduce((sum, payment) => sum + payment.amount, 0),
          paymentCount: payments.length
        }
      ])
    );

    // Calculate payment data for each client
    const clientsWithPaymentData = clients.map(client => {
      const paymentData = paymentMap.get(client.id) || { totalPaid: 0, paymentCount: 0 };

      // Calculate remaining amount
      const totalDue = client.price;
      const remainingAmount = totalDue - paymentData.totalPaid;

      // Determine the effective payment status based on actual payments
      let effectivePaymentStatus = client.paymentStatus;
      if (paymentData.totalPaid > 0 && paymentData.totalPaid < totalDue) {
        effectivePaymentStatus = 'partial';
      } else if (paymentData.totalPaid >= totalDue) {
        effectivePaymentStatus = 'paid';
      } else if (paymentData.totalPaid === 0) {
        effectivePaymentStatus = 'unpaid';
      }

      return {
        ...client,
        _count: {
          payments: paymentData.paymentCount
        },
        totalPaid: paymentData.totalPaid,
        remainingAmount: remainingAmount,
        effectivePaymentStatus: effectivePaymentStatus
      };
    });

    return clientsWithPaymentData;
  }

  // Return clients without payment data if no clients found
  return clients.map(client => ({
    ...client,
    _count: {
      payments: 0
    },
    totalPaid: 0,
    remainingAmount: client.price,
    effectivePaymentStatus: client.paymentStatus
  }));
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