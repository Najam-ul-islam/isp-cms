import {prisma} from '@/lib/prisma';
import { DailyReport, MonthlyReport, ExpiryReport, PaymentStatusReport, AreaReport } from '../types/report.types';

export const getDailyReport = async (date: Date): Promise<DailyReport> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const [
    totalClients,
    newClients,
    activeClients,
    expiredClients,
    paymentsResult,
    expensesResult
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }),
    prisma.client.count({
      where: {
        status: 'active'
      }
    }),
    prisma.client.count({
      where: {
        status: 'expired'
      }
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        amount: true
      }
    }),
    prisma.expense.aggregate({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      _sum: {
        amount: true
      }
    })
  ]);

  return {
    date: date.toISOString().split('T')[0],
    totalClients,
    newClients,
    activeClients,
    expiredClients,
    totalPayments: paymentsResult._sum.amount || 0,
    totalExpenses: expensesResult._sum.amount || 0,
    netRevenue: (paymentsResult._sum.amount || 0) - (expensesResult._sum.amount || 0)
  };
};

export const getMonthlyReport = async (month: number, year: number): Promise<MonthlyReport> => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const [
    totalClients,
    newClients,
    activeClients,
    expiredClients,
    totalPayments,
    totalExpenses
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    }),
    prisma.client.count({
      where: {
        status: 'active'
      }
    }),
    prisma.client.count({
      where: {
        status: 'expired'
      }
    }),
    prisma.payment.aggregate({
      where: {
        paymentDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    }),
    prisma.expense.aggregate({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        amount: true
      }
    })
  ]);

  // Generate daily breakdown
  const dailyBreakdown: DailyReport[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    dailyBreakdown.push(await getDailyReport(date));
  }

  return {
    month: startOfMonth.toLocaleString('default', { month: 'long' }),
    year,
    totalClients,
    newClients,
    activeClients,
    expiredClients,
    totalPayments: totalPayments._sum.amount || 0,
    totalExpenses: totalExpenses._sum.amount || 0,
    netRevenue: (totalPayments._sum.amount || 0) - (totalExpenses._sum.amount || 0),
    dailyBreakdown: dailyBreakdown  // Fix variable name
  };
};

export const getExpiryReport = async (): Promise<ExpiryReport> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  const [
    expiringToday,
    expiringThisWeek,
    expiringThisMonth,
    expired
  ] = await Promise.all([
    prisma.client.count({
      where: {
        expiryDate: {
          gte: today,
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        },
        status: 'active'
      }
    }),
    prisma.client.count({
      where: {
        expiryDate: {
          gte: today,
          lt: nextWeek
        },
        status: 'active'
      }
    }),
    prisma.client.count({
      where: {
        expiryDate: {
          gte: today,
          lt: nextMonth
        },
        status: 'active'
      }
    }),
    prisma.client.count({
      where: {
        expiryDate: {
          lt: today
        },
        status: 'expired'
      }
    })
  ]);

  return {
    expiringToday,
    expiringThisWeek,
    expiringThisMonth,
    expired
  };
};

export const getPaymentStatusReport = async (): Promise<PaymentStatusReport> => {
  const [paid, unpaid, partiallyPaid] = await Promise.all([
    prisma.client.count({
      where: {
        paymentStatus: 'paid'
      }
    }),
    prisma.client.count({
      where: {
        paymentStatus: 'unpaid'
      }
    }),
    prisma.client.count({
      where: {
        paymentStatus: 'partial'
      }
    })
  ]);

  return {
    paid,
    unpaid,
    partiallyPaid
  };
};

export const getAreaReport = async (): Promise<AreaReport> => {
  // Get all areas with their client counts
  const areas = await prisma.area.findMany({
    include: {
      _count: {
        select: {
          clients: true
        }
      },
      clients: {
        select: {
          id: true,
          status: true,
          price: true
        }
      }
    }
  });

  const areaReport: AreaReport = {};

  for (const area of areas) {
    const activeCount = area.clients.filter(c => c.status === 'active').length;
    const expiredCount = area.clients.filter(c => c.status === 'expired').length;

    areaReport[area.name] = {
      totalClients: area._count.clients,
      activeClients: activeCount,
      expiredClients: expiredCount
    };
  }

  return areaReport;
};