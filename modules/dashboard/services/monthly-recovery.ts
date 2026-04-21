import "server-only";
import { prisma } from "@/lib/prisma";
import { ClientStatus, PaymentStatus } from "@prisma/client";

export interface MonthlyRecoveryStats {
  monthlyTarget: number;
  monthlyRecovered: number;
  remaining: number;
  lastUpdated: string;
}

export const getMonthlyRecoveryStats = async (companyId: string): Promise<MonthlyRecoveryStats> => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const startOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
  const startOfNextMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 0, 0, 0, 0));

  // Optimized: single aggregate query instead of fetching all clients
  const monthlyTargetResult = await prisma.client.aggregate({
    where: {
      companyId,
      status: ClientStatus.active,
    },
    _sum: {
      price: true,
    },
  });

  const monthlyTarget = monthlyTargetResult._sum.price || 0;

  const recoveredPayments = await prisma.payment.aggregate({
    where: {
      companyId,
      status: "success",
      paymentDate: {
        gte: startOfCurrentMonth,
        lt: startOfNextMonth,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const monthlyRecovered = recoveredPayments._sum.amount || 0;
  const remaining = Math.max(monthlyTarget - monthlyRecovered, 0);

  return {
    monthlyTarget,
    monthlyRecovered,
    remaining,
    lastUpdated: new Date().toISOString(),
  };
};