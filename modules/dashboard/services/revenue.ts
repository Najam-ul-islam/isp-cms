'use strict';
import "server-only";
import { prisma } from '@/lib/prisma';
import { emitEvent } from '@/lib/sse-service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const PAKISTAN_TIMEZONE = 'Asia/Karachi';

export interface RevenueResult {
  totalRevenue: number;
  currentMonthData: {
    year: number;
    month: number;
    totalRevenue: number;
  } | null;
  lastRolledOver: {
    year: number;
    month: number;
    revenueAmount: number;
    cumulativeRevenue: number;
  } | null;
}

export interface RevenueHistoryResult {
  id: string;
  year: number;
  month: number;
  revenueAmount: number;
  cumulativeRevenue: number;
  rolloverType: 'automatic' | 'manual';
  createdAt: Date;
}

export interface RevenueRolloverResult {
  success: boolean;
  alreadyRolledOver: boolean;
  revenueAmount: number;
  previousCumulative: number;
  newCumulativeRevenue: number;
  historyId: string;
  year: number;
  month: number;
  error?: string;
}

function getPakistanNow(): dayjs.Dayjs {
  return dayjs().tz(PAKISTAN_TIMEZONE);
}

const getCurrentBillingMonth = (): { year: number; month: number; key: string } => {
  const now = getPakistanNow();
  const year = now.year();
  const month = now.month() + 1;
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, '0')}`,
  };
};

const getPreviousBillingMonth = (
  year: number,
  month: number
): { year: number; month: number } => {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
};

const getMonthDateRange = (
  year: number,
  month: number
): [Date, Date] => {
  const start = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, PAKISTAN_TIMEZONE).startOf('month').toDate();
  const end = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, PAKISTAN_TIMEZONE).endOf('month').toDate();
  return [start, end];
};

export const calculateMonthlyRevenueAmount = async (
  companyId: string,
  year?: number,
  month?: number
): Promise<number> => {
  const billingMonth = getCurrentBillingMonth();
  const targetYear = year ?? billingMonth.year;
  const targetMonth = month ?? billingMonth.month;
  const [monthStart, monthEnd] = getMonthDateRange(targetYear, targetMonth);

  const result = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      companyId,
      status: 'success',
      paymentDate: { gte: monthStart, lte: monthEnd },
    },
  });

  return result._sum.amount || 0;
};

export const getCurrentMonthRevenue = async (
  companyId: string
): Promise<RevenueResult> => {
  const billingMonth = getCurrentBillingMonth();

  const [record, lastRolled, liveRevenue] = await Promise.all([
    prisma.monthlyRevenue.findUnique({
      where: {
        companyId_year_month: {
          companyId,
          year: billingMonth.year,
          month: billingMonth.month,
        },
      },
    }),
    prisma.revenueHistory.findFirst({
      where: { companyId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    calculateMonthlyRevenueAmount(companyId),
  ]);

  return {
    totalRevenue: liveRevenue,
    currentMonthData: {
      year: billingMonth.year,
      month: billingMonth.month,
      totalRevenue: liveRevenue,
    },
    lastRolledOver: lastRolled
      ? {
          year: lastRolled.year,
          month: lastRolled.month,
          revenueAmount: lastRolled.revenueAmount,
          cumulativeRevenue: lastRolled.cumulativeRevenue,
        }
      : null,
  };
};

export const checkRevenueRolloverDone = async (
  companyId: string,
  year: number,
  month: number
): Promise<{
  done: boolean;
  historyId?: string;
  cumulativeRevenue?: number;
}> => {
  const history = await prisma.revenueHistory.findUnique({
    where: {
      companyId_year_month: { companyId, year, month },
    },
  });

  if (history) {
    return {
      done: true,
      historyId: history.id,
      cumulativeRevenue: history.cumulativeRevenue,
    };
  }
  return { done: false };
};

export const performMonthlyRevenueRollover = async (
  companyId: string,
  rolloverType: 'automatic' | 'manual' = 'automatic',
  year?: number,
  month?: number
): Promise<RevenueRolloverResult> => {
  const billingMonth = getCurrentBillingMonth();
  const targetYear = year ?? billingMonth.year;
  const targetMonth = month ?? billingMonth.month;

  try {
    const idemCheck = await checkRevenueRolloverDone(companyId, targetYear, targetMonth);
    if (idemCheck.done) {
      return {
        success: true,
        alreadyRolledOver: true,
        revenueAmount: 0,
        previousCumulative: 0,
        newCumulativeRevenue: idemCheck.cumulativeRevenue ?? 0,
        historyId: idemCheck.historyId ?? '',
        year: targetYear,
        month: targetMonth,
        error: 'Revenue rollover already completed for this month',
      };
    }

    const revenueAmount = await calculateMonthlyRevenueAmount(
      companyId,
      targetYear,
      targetMonth
    );

    const prevPeriod = getPreviousBillingMonth(targetYear, targetMonth);
    const prevHistory = await prisma.revenueHistory.findUnique({
      where: {
        companyId_year_month: {
          companyId,
          year: prevPeriod.year,
          month: prevPeriod.month,
        },
      },
    });

    const previousCumulative = prevHistory?.cumulativeRevenue ?? 0;
    const newCumulativeRevenue = previousCumulative + revenueAmount;

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.monthlyRevenue.upsert({
          where: {
            companyId_year_month: {
              companyId,
              year: targetYear,
              month: targetMonth,
            },
          },
          create: {
            companyId,
            year: targetYear,
            month: targetMonth,
            totalRevenue: revenueAmount,
            previousRevenue: previousCumulative,
          },
          update: {
            totalRevenue: revenueAmount,
            previousRevenue: previousCumulative,
          },
        });

        const history = await tx.revenueHistory.create({
          data: {
            companyId,
            year: targetYear,
            month: targetMonth,
            revenueAmount,
            cumulativeRevenue: newCumulativeRevenue,
            cumulativePrev: previousCumulative,
            rolloverType,
          },
        });

        return history;
      },
      {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'Serializable',
      }
    );

    try {
      await emitEvent('revenue_rolled_over', {
        companyId,
        revenueAmount,
        previousCumulative,
        newCumulativeRevenue,
        year: targetYear,
        month: targetMonth,
        rolloverType,
        historyId: result.id,
        alreadyRolledOver: false,
      }, companyId);
    } catch (sseError) {
      console.warn('[RevenueRollover] SSE emit failed (non-fatal):', sseError);
    }

    return {
      success: true,
      alreadyRolledOver: false,
      revenueAmount,
      previousCumulative,
      newCumulativeRevenue,
      historyId: result.id,
      year: targetYear,
      month: targetMonth,
    };
  } catch (error) {
    console.error('[RevenueRollover] Transaction failed:', error);
    return {
      success: false,
      alreadyRolledOver: false,
      revenueAmount: 0,
      previousCumulative: 0,
      newCumulativeRevenue: 0,
      historyId: '',
      year: targetYear,
      month: targetMonth,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getRevenueHistory = async (
  companyId: string,
  limit: number = 12
): Promise<RevenueHistoryResult[]> => {
  const history = await prisma.revenueHistory.findMany({
    where: { companyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: limit,
  });

  return history.map((h) => ({
    id: h.id,
    year: h.year,
    month: h.month,
    revenueAmount: h.revenueAmount,
    cumulativeRevenue: h.cumulativeRevenue,
    rolloverType: h.rolloverType,
    createdAt: h.createdAt,
  }));
};

export const getRevenueSummaryByPeriod = async (
  companyId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<RevenueHistoryResult[]> => {
  const all = await prisma.revenueHistory.findMany({
    where: {
      companyId,
      OR: [
        { year: startYear, month: { gte: startMonth } },
        { year: { gt: startYear, lt: endYear } },
        { year: endYear, month: { lte: endMonth } },
      ],
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  });

  return all.map((h) => ({
    id: h.id,
    year: h.year,
    month: h.month,
    revenueAmount: h.revenueAmount,
    cumulativeRevenue: h.cumulativeRevenue,
    rolloverType: h.rolloverType,
    createdAt: h.createdAt,
  }));
};
