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
   * Optimized: fetches all unpaid/partial invoices in one query instead of N+1
   *
   * @param companyId - Company ID
   * @returns Total pending recovery amount
   */
  static async getPendingRecovery(companyId: string): Promise<number> {
    // Fetch all unpaid/partial invoices for the company with their payments
    const invoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['unpaid', 'partial'] }
      },
      include: {
        payments: {
          select: { amount: true }
        }
      }
    });

    // Calculate total remaining
    let totalPending = 0;
    for (const invoice of invoices) {
      const charges = typeof invoice.additionalCharges === 'string'
        ? JSON.parse(invoice.additionalCharges)
        : invoice.additionalCharges;
      const chargesSum = Array.isArray(charges)
        ? charges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
        : 0;
      const invoiceTotal = invoice.amount + chargesSum + (invoice.carryForwardAmount || 0);
      const paid = invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      totalPending += Math.max(invoiceTotal - paid, 0);
    }

    return totalPending;
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

   /**
    * Get DISTINCT client IDs from PAID invoices (any source).
    *
    * Source of truth: Invoice (NOT Payment).
    *   Invoice.status = 'paid' → billing cycle is complete
    *
    * Why NOT Payment? Payment has no `type` field, its `status` is a free-form
    * string that may not match, and filtering through payment→invoice is fragile.
    * Invoice.status is an enum with exact values: unpaid | partial | paid.
    *
    * NOTE: We intentionally do NOT filter by source (package/manual) because
    * the source field may be inconsistent for historical data. A paid invoice
    * of any source indicates the client has made a payment.
    */
   static async getPaidClientIds(
     companyId: string,
     monthStart: Date,
     monthEnd: Date
   ): Promise<string[]> {
     const paidInvoices = await prisma.invoice.findMany({
       where: {
         companyId,
         status: 'paid',
         issuedDate: { gte: monthStart, lte: monthEnd },
       },
       select: { clientId: true },
       distinct: ['clientId'],
     });

     const ids = paidInvoices.map(inv => inv.clientId);

     console.log('[Revenue] getPaidClientIds — paid invoices this month:', paidInvoices.length);
     console.log('[Revenue] getPaidClientIds — distinct client IDs:', ids.length, ids.slice(0, 10));

     return ids;
   }

  /**
   * Calculate total revenue (profit-based, NOT cash-based):
   *
   *   totalRevenue = packageMargin + otherIncome
   *
   *   packageMargin = SUM(client.price - package.purchasePrice)
   *                   for clients with a PAID package invoice this month
   *
   *   otherIncome   = SUM((sellingPrice - actualPrice) * quantity)
   *                   for product sales with status='paid' this month
   *
   * Diagnostic logs at every step so 0-revenue is instantly debuggable.
   */
  static async calculateTotalRevenue(
    companyId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<{ totalRevenue: number; packageMargin: number; otherIncome: number; paidClientCount: number }> {

     // ── Step 1: Diagnostics — what does the DB actually contain? ──
     const [
       invoiceStatusCounts, 
       totalInvoices, 
       invoicesBySource, 
       totalPayments, 
       paymentStatusSample,
       samplePaidInvoices
     ] = await Promise.all([
       prisma.invoice.groupBy({
         by: ['status'],
         where: { companyId, issuedDate: { gte: monthStart, lte: monthEnd } },
         _count: { id: true },
       }),
       prisma.invoice.count({
         where: { companyId, issuedDate: { gte: monthStart, lte: monthEnd } },
       }),
       prisma.invoice.groupBy({
         by: ['source'],
         where: { companyId, issuedDate: { gte: monthStart, lte: monthEnd } },
         _count: { id: true },
       }),
       prisma.payment.count({
         where: { companyId, paymentDate: { gte: monthStart, lte: monthEnd } },
       }),
       prisma.payment.groupBy({
         by: ['status'],
         where: { companyId, paymentDate: { gte: monthStart, lte: monthEnd } },
         _count: { id: true },
       }),
       // Sample paid invoices for debugging
       prisma.invoice.findMany({
         where: { companyId, status: 'paid', issuedDate: { gte: monthStart, lte: monthEnd } },
         take: 5,
         select: { 
           id: true, 
           invoiceNumber: true, 
           status: true, 
           source: true, 
           totalAmount: true,
           items: { select: { type: true, name: true, amount: true } }
         },
       }),
     ]);

     console.log('[Revenue] ── DIAGNOSTICS ──');
     console.log('[Revenue] Month range:', monthStart.toISOString(), '→', monthEnd.toISOString());
     console.log('[Revenue] Invoices this month (total):', totalInvoices);
     console.log('[Revenue] Invoice status breakdown:', JSON.stringify(invoiceStatusCounts));
     console.log('[Revenue] Invoice source breakdown:', JSON.stringify(invoicesBySource));
     console.log('[Revenue] Payments this month (total):', totalPayments);
     console.log('[Revenue] Payment status breakdown:', JSON.stringify(paymentStatusSample));
     if (samplePaidInvoices.length > 0) {
       console.log('[Revenue] Sample paid invoices:');
       samplePaidInvoices.forEach(inv => {
         const itemInfo = inv.items.map(i => `${i.type}:${i.name}`).join(', ');
         console.log(`  #${inv.invoiceNumber || inv.id.slice(0,8)} status=${inv.status} source=${inv.source} total=${inv.totalAmount} items=[${itemInfo}]`);
       });
     } else {
       console.log('[Revenue] No paid invoices found in this month.');
     }

    // ── Step 2: Get paid client IDs from Invoice (source of truth) ──
    const paidClientIds = await this.getPaidClientIds(companyId, monthStart, monthEnd);

    // ── Step 3: Fetch client+package data and product sales in parallel ──
    const [paidClients, productSales] = await Promise.all([
      paidClientIds.length > 0
        ? prisma.client.findMany({
            where: { id: { in: paidClientIds }, companyId },
            select: {
              id: true,
              price: true,
              package: { select: { purchasePrice: true } },
            },
          })
        : Promise.resolve([]),

      prisma.productSale.findMany({
        where: {
          companyId,
          status: 'paid',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        select: { sellingPrice: true, actualPrice: true, quantity: true },
      }),
    ]);

    console.log('[Revenue] Paid clients fetched:', paidClients.length);
    if (paidClients.length > 0 && paidClients.length <= 20) {
      console.log('[Revenue] Paid clients detail:', JSON.stringify(paidClients));
    }
    console.log('[Revenue] Paid product sales this month:', productSales.length);

    // ── Step 4: Calculate package margin ──
    const packageMargin = paidClients.reduce((sum, client) => {
      const purchasePrice = client.package?.purchasePrice ?? 0;
      return sum + (client.price - purchasePrice);
    }, 0);

    // ── Step 5: Calculate product sales profit ──
    const otherIncome = productSales.reduce((sum, sale) => {
      return sum + (sale.sellingPrice - sale.actualPrice) * sale.quantity;
    }, 0);

    const totalRevenue = packageMargin + otherIncome;

    console.log('[Revenue] ── RESULT ──');
    console.log('[Revenue] Package Margin:', packageMargin);
    console.log('[Revenue] Other Income (product profit):', otherIncome);
    console.log('[Revenue] Total Revenue:', totalRevenue);

    return { totalRevenue, packageMargin, otherIncome, paidClientCount: paidClients.length };
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
