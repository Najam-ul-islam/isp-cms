import "server-only";
import { prisma } from "@/lib/prisma";

export interface MonthlyClientStats {
  currentMonthCount: number;
  history: YearMonthCount[];
}

export interface YearMonthCount {
  yearMonth: string;
  count: number;
}

export const getMonthlyClientStats = async (companyId: string, historyMonths: number = 6): Promise<MonthlyClientStats> => {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const startOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
  const endOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

  const currentMonthCount = await prisma.client.count({
    where: {
      companyId,
      createdAt: {
        gte: startOfCurrentMonth,
        lte: endOfCurrentMonth,
      },
    },
  });

  const history: YearMonthCount[] = [];
  for (let i = 1; i <= historyMonths; i++) {
    const targetMonth = currentMonth - i;
    const targetYear = currentYear + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;

    const startOfMonth = new Date(Date.UTC(targetYear, normalizedMonth, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0, 23, 59, 59, 999));

    const count = await prisma.client.count({
      where: {
        companyId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const yearMonth = `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}`;
    history.push({ yearMonth, count });
  }

  return { currentMonthCount, history };
};