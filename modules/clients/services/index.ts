import prisma from '@/lib/prisma';
import { ClientStatus, PaymentStatus } from '@prisma/client';

export type ClientFilters = {
  status?: ClientStatus;
  paymentStatus?: PaymentStatus;
  expiring?: boolean;
  search?: string;
};

export const getClientsWithFilters = async (filters?: ClientFilters) => {
  const whereClause: any = {};

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

  return await prisma.client.findMany({
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
};

export const getClientStats = async (filters?: ClientFilters) => {
  const whereClause: any = {};

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