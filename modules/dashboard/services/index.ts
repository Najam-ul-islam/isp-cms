import prisma from '@/lib/prisma';
import { ClientStatus, PaymentStatus } from '@prisma/client';
import { getPaymentStats } from '../../payments/services';
import { getExpenseStats } from '../../expenses/services';

export const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const next3Days = new Date(today);
  next3Days.setDate(today.getDate() + 3);

  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  // Client counts
  const totalUsers = await prisma.client.count();
  const activeUsers = await prisma.client.count({
    where: { status: ClientStatus.active }
  });
  const expiredUsers = await prisma.client.count({
    where: { status: ClientStatus.expired }
  });

  // Expiration alerts
  const expireToday = await prisma.client.count({
    where: {
      expiryDate: {
        gte: today,
        lte: endOfDay
      },
      status: ClientStatus.active
    }
  });

  const expireNext3Days = await prisma.client.count({
    where: {
      expiryDate: {
        gt: endOfDay,
        lte: next3Days
      },
      status: ClientStatus.active
    }
  });

  const expireNext7Days = await prisma.client.count({
    where: {
      expiryDate: {
        gt: next3Days,
        lte: next7Days
      },
      status: ClientStatus.active
    }
  });

  // Revenue metrics
  const paidToday = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.paid,
      expiryDate: {
        gte: today,
        lte: endOfDay
      }
    }
  });

  const dueToday = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.unpaid,
      expiryDate: {
        gte: today,
        lte: endOfDay
      }
    }
  });

  const dueNext7Days = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.unpaid,
      expiryDate: {
        gt: endOfDay,
        lte: next7Days
      }
    }
  });

  // New extended metrics
  const totalRevenue = await getPaymentStats();
  const totalExpenses = await getExpenseStats();
  const todayRecovery = await getPaymentStats(today, today);
  const todayExpenses = await getExpenseStats(today, today);
  const newUsersToday = await prisma.client.count({
    where: {
      createdAt: {
        gte: today,
        lte: endOfDay
      }
    }
  });

  return {
    totalUsers,
    activeUsers,
    expiredUsers,

    expireToday,
    expireNext3Days,
    expireNext7Days,

    paidToday: paidToday._sum.price || 0,
    dueToday: dueToday._sum.price || 0,
    dueNext7Days: dueNext7Days._sum.price || 0,

    // Extended metrics
    totalRevenue: totalRevenue._sum.amount || 0,
    totalExpenses: totalExpenses._sum.amount || 0,
    netProfit: (totalRevenue._sum.amount || 0) - (totalExpenses._sum.amount || 0),
    todayRecovery: todayRecovery._sum.amount || 0,
    todayExpenses: todayExpenses._sum.amount || 0,
    newUsersToday,
    expiringToday: expireToday
  };
};

export const getExpiringClients = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  const expiringClients = await prisma.client.findMany({
    where: {
      expiryDate: {
        gte: today,
        lte: next7Days
      },
      status: ClientStatus.active
    },
    include: {
      package: {
        include: {
          serviceProvider: true
        }
      }
    },
    orderBy: {
      expiryDate: 'asc'
    }
  });

  // Transform data to include days left
  return expiringClients.map(client => ({
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email || '', // Use the email field from the updated schema
    package: client.package.name,
    expiryDate: client.expiryDate,
    daysLeft: Math.ceil(
      (new Date(client.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
  }));
};