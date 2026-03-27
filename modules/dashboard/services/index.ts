import "server-only";
import {prisma} from '@/lib/prisma';
import { ClientStatus, PaymentStatus } from '@prisma/client';
import { getAccountSummary } from '../../accounts/services';
import { getAreaInsights } from '../../areas/services';
import { getInventoryStats } from '../../inventory/services';
import { getEmployeeStats } from '../../employees/services';
import { AdminWithPackages } from '@/lib/jwt';

export const getDashboardStats = async (admin: AdminWithPackages) => {
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

  // Client counts (with multi-tenancy)
  const totalUsers = await prisma.client.count({
    where: { companyId: admin.companyId }
  });
  const activeUsers = await prisma.client.count({
    where: {
      status: ClientStatus.active,
      companyId: admin.companyId
    }
  });
  const expiredUsers = await prisma.client.count({
    where: {
      status: ClientStatus.expired,
      companyId: admin.companyId
    }
  });

  // Expiration alerts (with multi-tenancy)
  const expireToday = await prisma.client.count({
    where: {
      expiryDate: {
        gte: today,
        lte: endOfDay
      },
      status: ClientStatus.active,
      companyId: admin.companyId
    }
  });

  const expireNext3Days = await prisma.client.count({
    where: {
      expiryDate: {
        gt: endOfDay,
        lte: next3Days
      },
      status: ClientStatus.active,
      companyId: admin.companyId
    }
  });

  const expireNext7Days = await prisma.client.count({
    where: {
      expiryDate: {
        gt: next3Days,
        lte: next7Days
      },
      status: ClientStatus.active,
      companyId: admin.companyId
    }
  });

  // Revenue metrics (with multi-tenancy)
  const paidToday = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.paid,
      expiryDate: {
        gte: today,
        lte: endOfDay
      },
      companyId: admin.companyId
    }
  });

  const dueToday = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.unpaid,
      expiryDate: {
        gte: today,
        lte: endOfDay
      },
      companyId: admin.companyId
    }
  });

  const dueNext7Days = await prisma.client.aggregate({
    _sum: { price: true },
    where: {
      paymentStatus: PaymentStatus.unpaid,
      expiryDate: {
        gt: endOfDay,
        lte: next7Days
      },
      companyId: admin.companyId
    }
  });

  // New extended metrics with multi-tenancy
  const totalRevenue = await getPaymentStatsByCompany(admin.companyId);
  const totalExpenses = await getExpenseStatsByCompany(admin.companyId);
  const todayRecovery = await getPaymentStatsByCompany(admin.companyId, today, today);
  const todayExpenses = await getExpenseStatsByCompany(admin.companyId, today, today);
  const newUsersToday = await prisma.client.count({
    where: {
      createdAt: {
        gte: today,
        lte: endOfDay
      },
      companyId: admin.companyId
    }
  });

  // Get account summary
  const accountSummary = await getAccountSummary(admin.companyId);

  // Get area insights
  const areaInsights = await getAreaInsights(admin.companyId);

  // Get inventory and employee stats
  const inventoryStats = await getInventoryStats(admin);
  const employeeStats = await getEmployeeStats(admin);

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
    expiringToday: expireToday,

    // Phase 3 additions
    totalReceivable: accountSummary.totalReceivable,
    totalPayable: accountSummary.totalPayable,
    netBalance: accountSummary.netBalance,
    areaInsights: areaInsights,

    // New inventory and employee stats
    totalInventoryItems: inventoryStats.totalItems,
    lowStockItems: inventoryStats.lowStockItems,
    totalInventoryValue: inventoryStats.totalValue,
    totalEmployees: employeeStats.totalEmployees,
    employeeRoles: employeeStats.roleCounts
  };
};

// Helper functions for multi-tenancy with existing modules
const getPaymentStatsByCompany = async (companyId: string, startDate?: Date, endDate?: Date) => {
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

const getExpenseStatsByCompany = async (companyId: string, startDate?: Date, endDate?: Date) => {
  const whereClause: any = {
    companyId
  };

  if (startDate && endDate) {
    whereClause.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    whereClause.date = {
      gte: startDate,
    };
  } else if (endDate) {
    whereClause.date = {
      lte: endDate,
    };
  }

  return await prisma.expense.aggregate({
    where: whereClause,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });
};

export const getExpiringClients = async (admin: AdminWithPackages) => {
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
      status: ClientStatus.active,
      companyId: admin.companyId
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