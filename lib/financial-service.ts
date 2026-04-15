/**
 * Financial Service - Dashboard Metrics Calculation
 * 
 * Production-grade service for accurate financial calculations.
 * All functions are reusable, testable, and handle edge cases.
 * 
 * Usage:
 *   import { FinancialService } from '@/lib/financial-service';
 *   const recovery = await FinancialService.getTodaysRecovery(companyId);
 */

import { prisma } from './prisma';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get start of day (local timezone)
 */
export const startOfDay = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Get end of day (local timezone)
 */
export const endOfDay = (date: Date = new Date()): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * Get date range for filtering
 */
interface DateRange {
  start: Date;
  end: Date;
}

export const getDateRange = (
  period: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom',
  customStart?: Date,
  customEnd?: Date
): DateRange => {
  const now = new Date();

  switch (period) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };

    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }

    case 'this-week': {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
      return { start: startOfDay(weekStart), end: endOfDay(now) };
    }

    case 'this-month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(monthStart), end: endOfDay(now) };
    }

    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires start and end dates');
      }
      return { start: startOfDay(customStart), end: endOfDay(customEnd) };

    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
};

// ─────────────────────────────────────────────────────────────
// Financial Service
// ─────────────────────────────────────────────────────────────

export class FinancialService {
  /**
   * Get today's recovery (sum of successful payments made today)
   * Uses paymentDate (NOT createdAt) to support backdated payments
   * 
   * @param companyId - Company ID to filter by
   * @returns Total recovery amount for today
   */
  static async getTodaysRecovery(companyId: string): Promise<number> {
    const { start, end } = getDateRange('today');

    const result = await prisma.payment.aggregate({
      where: {
        companyId,
        status: 'success',
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get recovery for a specific date range
   * 
   * @param companyId - Company ID
   * @param period - Time period or 'custom'
   * @param customStart - Start date (required if period='custom')
   * @param customEnd - End date (required if period='custom')
   * @returns Total recovery for the period
   */
  static async getRecoveryByPeriod(
    companyId: string,
    period: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom' = 'today',
    customStart?: Date,
    customEnd?: Date
  ): Promise<number> {
    const { start, end } = getDateRange(period, customStart, customEnd);

    const result = await prisma.payment.aggregate({
      where: {
        companyId,
        status: 'success',
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get today's expenses (sum of expenses recorded today)
   * Uses expense date (NOT createdAt)
   * 
   * @param companyId - Company ID
   * @returns Total expenses for today
   */
  static async getTodaysExpenses(companyId: string): Promise<number> {
    const { start, end } = getDateRange('today');

    const result = await prisma.expense.aggregate({
      where: {
        companyId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get expenses for a specific period
   * 
   * @param companyId - Company ID
   * @param period - Time period
   * @param customStart - Start date (if custom)
   * @param customEnd - End date (if custom)
   * @returns Total expenses for the period
   */
  static async getExpensesByPeriod(
    companyId: string,
    period: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom' = 'today',
    customStart?: Date,
    customEnd?: Date
  ): Promise<number> {
    const { start, end } = getDateRange(period, customStart, customEnd);

    const result = await prisma.expense.aggregate({
      where: {
        companyId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get other income (product sales profit) for today
   * ONLY includes totalOtherIncome from ProductSale table
   * Does NOT include payments
   * 
   * @param companyId - Company ID
   * @returns Total other income (profit) for today
   */
  static async getTodaysOtherIncome(companyId: string): Promise<number> {
    const { start, end } = getDateRange('today');

    const result = await prisma.productSale.aggregate({
      where: {
        companyId,
        saleDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: { totalOtherIncome: true },
    });

    return result._sum.totalOtherIncome || 0;
  }

  /**
   * Get other income for a specific period
   * 
   * @param companyId - Company ID
   * @param period - Time period
   * @param customStart - Start date (if custom)
   * @param customEnd - End date (if custom)
   * @returns Total other income for the period
   */
  static async getOtherIncomeByPeriod(
    companyId: string,
    period: 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom' = 'today',
    customStart?: Date,
    customEnd?: Date
  ): Promise<number> {
    const { start, end } = getDateRange(period, customStart, customEnd);

    const result = await prisma.productSale.aggregate({
      where: {
        companyId,
        saleDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: { totalOtherIncome: true },
    });

    return result._sum.totalOtherIncome || 0;
  }

  /**
   * Get pending recovery (total outstanding from all clients)
   * Uses getClientPaymentSummary for real-time calculation
   * Includes: invoices + additional charges + carry-forward + unpaid product sales
   * 
   * @param companyId - Company ID
   * @returns Total pending recovery amount
   */
  static async getPendingRecovery(companyId: string): Promise<number> {
    // Import dynamically to avoid circular dependencies
    const { getClientPaymentSummary } = await import('./payment-calculator');

    const clients = await prisma.client.findMany({
      where: { companyId },
      select: { id: true },
    });

    // Calculate remaining for each client in parallel
    const paymentSummaries = await Promise.all(
      clients.map(async (client) => {
        try {
          const summary = await getClientPaymentSummary(client.id);
          return summary.remainingAmount;
        } catch (error) {
          console.error(`[FinancialService] Error calculating payment summary for client ${client.id}:`, error);
          return 0;
        }
      })
    );

    // Sum all remaining amounts
    const totalPendingRecovery = paymentSummaries.reduce((sum, remaining) => sum + remaining, 0);

    return totalPendingRecovery;
  }

  /**
   * Get complete financial summary for dashboard
   * All metrics in a single call
   * 
   * @param companyId - Company ID
   * @returns Complete financial metrics
   */
  static async getDashboardFinancialSummary(companyId: string) {
    const [
      todaysRecovery,
      todaysExpenses,
      todaysOtherIncome,
      pendingRecovery,
    ] = await Promise.all([
      this.getTodaysRecovery(companyId),
      this.getTodaysExpenses(companyId),
      this.getTodaysOtherIncome(companyId),
      this.getPendingRecovery(companyId),
    ]);

    return {
      todaysRecovery,
      todaysExpenses,
      todaysOtherIncome,
      pendingRecovery,
      netProfit: todaysRecovery - todaysExpenses,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get payment count for today
   * 
   * @param companyId - Company ID
   * @returns Number of successful payments today
   */
  static async getTodaysPaymentCount(companyId: string): Promise<number> {
    const { start, end } = getDateRange('today');

    const result = await prisma.payment.aggregate({
      where: {
        companyId,
        status: 'success',
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
      _count: { id: true },
    });

    return result._count.id;
  }

  /**
   * Get expense breakdown by category for today
   * 
   * @param companyId - Company ID
   * @returns Array of { category, total, count }
   */
  static async getTodaysExpenseByCategory(companyId: string): Promise<Array<{
    category: string;
    total: number;
    count: number;
  }>> {
    const { start, end } = getDateRange('today');

    const results = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        companyId,
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return results.map(r => ({
      category: r.category,
      total: r._sum.amount || 0,
      count: r._count.id,
    }));
  }

  /**
   * Validate payment amount and date
   * Prevents invalid payments
   * 
   * @param amount - Payment amount
   * @param paymentDate - Payment date
   * @returns Validation result
   */
  static validatePayment(amount: number, paymentDate?: Date): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (amount <= 0) {
      errors.push('Payment amount must be greater than 0');
    }

    if (amount > 999999999) {
      errors.push('Payment amount exceeds maximum limit');
    }

    if (paymentDate && isNaN(paymentDate.getTime())) {
      errors.push('Invalid payment date');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate recovery trend (today vs yesterday)
   * 
   * @param companyId - Company ID
   * @returns { today, yesterday, changePercent }
   */
  static async getRecoveryTrend(companyId: string) {
    const [today, yesterday] = await Promise.all([
      this.getRecoveryByPeriod(companyId, 'today'),
      this.getRecoveryByPeriod(companyId, 'yesterday'),
    ]);

    const change = today - yesterday;
    const changePercent = yesterday === 0
      ? (today > 0 ? 100 : 0)
      : Math.round((change / yesterday) * 100);

    return {
      today,
      yesterday,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' as const,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────

export interface FinancialSummary {
  todaysRecovery: number;
  todaysExpenses: number;
  todaysOtherIncome: number;
  pendingRecovery: number;
  netProfit: number;
  timestamp: string;
}

export interface RecoveryTrend {
  today: number;
  yesterday: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ExpenseByCategory {
  category: string;
  total: number;
  count: number;
}
