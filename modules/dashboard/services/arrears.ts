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

export interface ArrearsResult {
  pendingRecovery: number;
  totalArrears: number;
  currentMonthData: {
    year: number;
    month: number;
    pendingRecovery: number;
    totalArrears: number;
  } | null;
  lastRolledOver: {
    year: number;
    month: number;
    pendingRecoveryAmount: number;
    amountRolledOver: number;
    cumulativeArrears: number;
  } | null;
}

export interface ArrearsHistoryResult {
  id: string;
  year: number;
  month: number;
  pendingRecoveryAmount: number;
  amountRolledOver: number;
  cumulativeArrears: number;
  rolloverType: 'automatic' | 'manual';
  createdAt: Date;
}

export interface RolloverResult {
  success: boolean;
  alreadyRolledOver: boolean;
  previousArrears: number;
  pendingRecovery: number;
  newTotalArrears: number;
  historyId: string;
  year: number;
  month: number;
  error?: string;
}

export interface PendingClientBreakdown {
  clientId: string;
  clientName: string;
  pendingAmount: number;
  lastPaymentDate: string | null;
}

function getPakistanNow(): dayjs.Dayjs {
  return dayjs().tz(PAKISTAN_TIMEZONE);
}

function getPakistanYear(date: Date): number {
  return dayjs(date).tz(PAKISTAN_TIMEZONE).year();
}

function getPakistanMonth(date: Date): number {
  return dayjs(date).tz(PAKISTAN_TIMEZONE).month() + 1;
}

export const getMonthDateRange = (
  year: number,
  month: number
): [Date, Date] => {
  const start = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, PAKISTAN_TIMEZONE).startOf('month').toDate();
  const end = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, PAKISTAN_TIMEZONE).endOf('month').toDate();
  return [start, end];
};

export const getBillingMonthKey = (date: Date = new Date()): string => {
  const year = getPakistanYear(date);
  const month = getPakistanMonth(date);
  return `${year}-${String(month).padStart(2, '0')}`;
};

export const getCurrentBillingMonth = (): { year: number; month: number; key: string } => {
  const now = getPakistanNow();
  const year = now.year();
  const month = now.month() + 1;
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, '0')}`,
  };
};

export const getPreviousBillingMonth = (
  year: number,
  month: number
): { year: number; month: number; key: string } => {
  if (month === 1) {
    return { year: year - 1, month: 12, key: `${year - 1}-12` };
  }
  return {
    year,
    month: month - 1,
    key: `${year}-${String(month - 1).padStart(2, '0')}`,
  };
};

export const getCurrentMonthPendingRecovery = async (
  companyId: string,
  year?: number,
  month?: number
): Promise<number> => {
  const billingMonth = getCurrentBillingMonth();
  const targetYear = year ?? billingMonth.year;
  const targetMonth = month ?? billingMonth.month;
  const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  const invoices = await prisma.invoice.aggregate({
    where: {
      companyId,
      status: { in: ['unpaid', 'partial'] },
      billingMonth: key,
    },
    _sum: {
      totalAmount: true,
      amount: true,
      carryForwardAmount: true,
    },
  });

  const invoiceTotal =
    (invoices._sum.totalAmount || invoices._sum.amount || 0) +
    (invoices._sum.carryForwardAmount || 0);

  return invoiceTotal;
};

export const calculatePendingRecoveryForRollover = async (
  companyId: string,
  year?: number,
  month?: number
): Promise<number> => {
  return getCurrentMonthPendingRecovery(companyId, year, month);
};

export const getCurrentMonthARrears = async (
  companyId: string
): Promise<ArrearsResult> => {
  const billingMonth = getCurrentBillingMonth();

  const record = await prisma.monthlyArrears.findUnique({
    where: {
      companyId_year_month: {
        companyId,
        year: billingMonth.year,
        month: billingMonth.month,
      },
    },
  });

  const lastRolled = await prisma.arrearsHistory.findFirst({
    where: { companyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const pendingRecovery = await getCurrentMonthPendingRecovery(companyId);

  return {
    pendingRecovery,
    totalArrears: record?.totalArrears ?? 0,
    currentMonthData: record
      ? {
          year: record.year,
          month: record.month,
          pendingRecovery: record.pendingRecovery,
          totalArrears: record.totalArrears,
        }
      : null,
    lastRolledOver: lastRolled
      ? {
          year: lastRolled.year,
          month: lastRolled.month,
          pendingRecoveryAmount: lastRolled.pendingRecoveryAmount,
          amountRolledOver: lastRolled.amountRolledOver,
          cumulativeArrears: lastRolled.cumulativeArrears,
        }
      : null,
  };
};

export const checkRolloverAlreadyDone = async (
  companyId: string,
  year: number,
  month: number
): Promise<{
  done: boolean;
  historyId?: string;
  totalArrears?: number;
}> => {
  const history = await prisma.arrearsHistory.findUnique({
    where: {
      companyId_year_month: { companyId, year, month },
    },
  });

  if (history) {
    return {
      done: true,
      historyId: history.id,
      totalArrears: history.cumulativeArrears,
    };
  }
  return { done: false };
};

export const performMonthlyRollover = async (
  companyId: string,
  rolloverType: 'automatic' | 'manual' = 'automatic',
  year?: number,
  month?: number
): Promise<RolloverResult> => {
  const billingMonth = getCurrentBillingMonth();
  const targetYear = year ?? billingMonth.year;
  const targetMonth = month ?? billingMonth.month;

  try {
    const idemCheck = await checkRolloverAlreadyDone(companyId, targetYear, targetMonth);
    if (idemCheck.done) {
      return {
        success: true,
        alreadyRolledOver: true,
        previousArrears: 0,
        pendingRecovery: 0,
        newTotalArrears: idemCheck.totalArrears ?? 0,
        historyId: idemCheck.historyId ?? '',
        year: targetYear,
        month: targetMonth,
        error: 'Rollover already completed for this month',
      };
    }

    const pendingRecovery = await getCurrentMonthPendingRecovery(
      companyId,
      targetYear,
      targetMonth
    );

    if (pendingRecovery <= 0) {
      return {
        success: false,
        alreadyRolledOver: false,
        previousArrears: 0,
        pendingRecovery: 0,
        newTotalArrears: 0,
        historyId: '',
        year: targetYear,
        month: targetMonth,
        error: 'No pending recovery to rollover for this period',
      };
    }

    const prevPeriod = getPreviousBillingMonth(targetYear, targetMonth);
    const prevMonthRecord = await prisma.monthlyArrears.findUnique({
      where: {
        companyId_year_month: {
          companyId,
          year: prevPeriod.year,
          month: prevPeriod.month,
        },
      },
    });

    const previousArrears = prevMonthRecord?.totalArrears ?? 0;
    const newTotalArrears = previousArrears + pendingRecovery;

    const result = await prisma.$transaction(
      async (tx) => {
        await tx.monthlyArrears.upsert({
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
            pendingRecovery: 0,
            totalArrears: newTotalArrears,
            previousArrears,
          },
          update: {
            pendingRecovery: 0,
            totalArrears: newTotalArrears,
            previousArrears,
          },
        });

        const history = await tx.arrearsHistory.create({
          data: {
            companyId,
            year: targetYear,
            month: targetMonth,
            pendingRecoveryAmount: pendingRecovery,
            amountRolledOver: pendingRecovery,
            cumulativeArrears: newTotalArrears,
            cumulativePrev: previousArrears,
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
      await emitEvent('arrears_roled_over', {
        companyId,
        previousArrears,
        pendingRecovery,
        newTotalArrears,
        year: targetYear,
        month: targetMonth,
        rolloverType,
        historyId: result.id,
        alreadyRolledOver: false,
      }, companyId);
    } catch (sseError) {
      console.warn('[ArrearsRollover] SSE emit failed (non-fatal):', sseError);
    }

    return {
      success: true,
      alreadyRolledOver: false,
      previousArrears,
      pendingRecovery,
      newTotalArrears,
      historyId: result.id,
      year: targetYear,
      month: targetMonth,
    };
  } catch (error) {
    console.error('[ArrearsRollover] Transaction failed:', error);
    return {
      success: false,
      alreadyRolledOver: false,
      previousArrears: 0,
      pendingRecovery: 0,
      newTotalArrears: 0,
      historyId: '',
      year: targetYear,
      month: targetMonth,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const getArrearsHistory = async (
  companyId: string,
  limit: number = 12
): Promise<ArrearsHistoryResult[]> => {
  const history = await prisma.arrearsHistory.findMany({
    where: { companyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: limit,
  });

  return history.map((h) => ({
    id: h.id,
    year: h.year,
    month: h.month,
    pendingRecoveryAmount: h.pendingRecoveryAmount,
    amountRolledOver: h.amountRolledOver,
    cumulativeArrears: h.cumulativeArrears,
    rolloverType: h.rolloverType,
    createdAt: h.createdAt,
  }));
};

export const getPendingClientsBreakdown = async (
  companyId: string,
  year?: number,
  month?: number
): Promise<PendingClientBreakdown[]> => {
  const billingMonth = getCurrentBillingMonth();
  const targetYear = year ?? billingMonth.year;
  const targetMonth = month ?? billingMonth.month;
  const key = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ['unpaid', 'partial'] },
      billingMonth: key,
    },
    select: {
      clientId: true,
      client: {
        select: { name: true },
      },
      totalAmount: true,
      amount: true,
      carryForwardAmount: true,
    },
  });

  const clientIds = [...new Set(unpaidInvoices.map((i) => i.clientId))];

  const [startOfMonth, endOfMonth] = getMonthDateRange(targetYear, targetMonth);
  const paymentsResult = await prisma.payment.groupBy({
    by: ['clientId'],
    where: {
      companyId,
      clientId: { in: clientIds },
      status: 'success',
      paymentDate: { gte: startOfMonth, lte: endOfMonth },
    },
    _sum: { amount: true },
  });

  const paymentMap = new Map(
    paymentsResult.map((p) => [p.clientId, p._sum.amount || 0])
  );

  return unpaidInvoices
    .map((inv) => {
      const invoiceTotal =
        (inv.totalAmount || inv.amount || 0) +
        (inv.carryForwardAmount || 0);
      const paid = paymentMap.get(inv.clientId) || 0;
      const pending = Math.max(invoiceTotal - paid, 0);
      return {
        clientId: inv.clientId,
        clientName: inv.client?.name ?? 'Unknown',
        pendingAmount: pending,
        lastPaymentDate: null,
      };
    })
    .filter((c) => c.pendingAmount > 0)
    .sort((a, b) => b.pendingAmount - a.pendingAmount);
};

export const getArrearSummaryByPeriod = async (
  companyId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<ArrearsHistoryResult[]> => {
  const all = await prisma.arrearsHistory.findMany({
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
    pendingRecoveryAmount: h.pendingRecoveryAmount,
    amountRolledOver: h.amountRolledOver,
    cumulativeArrears: h.cumulativeArrears,
    rolloverType: h.rolloverType,
    createdAt: h.createdAt,
  }));
};

export const resetPendingRecoveryForNewMonth = async (
  companyId: string
): Promise<{
  success: boolean;
  previousPendingRecovery: number;
  newPendingRecovery: number;
  error?: string;
}> => {
  const billingMonth = getCurrentBillingMonth();

  try {
    const existingRecord = await prisma.monthlyArrears.findUnique({
      where: {
        companyId_year_month: {
          companyId,
          year: billingMonth.year,
          month: billingMonth.month,
        },
      },
    });

    if (!existingRecord) {
      const pendingRecovery = await getCurrentMonthPendingRecovery(companyId);
      await prisma.monthlyArrears.create({
        data: {
          companyId,
          year: billingMonth.year,
          month: billingMonth.month,
          pendingRecovery,
          totalArrears: 0,
          previousArrears: 0,
        },
      });
      return {
        success: true,
        previousPendingRecovery: 0,
        newPendingRecovery: pendingRecovery,
      };
    }

    const currentPendingRecovery = await getCurrentMonthPendingRecovery(companyId);
    await prisma.monthlyArrears.update({
      where: { id: existingRecord.id },
      data: {
        pendingRecovery: currentPendingRecovery,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      previousPendingRecovery: existingRecord.pendingRecovery,
      newPendingRecovery: currentPendingRecovery,
    };
  } catch (error) {
    return {
      success: false,
      previousPendingRecovery: 0,
      newPendingRecovery: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};