import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching

/**
 * Helper: Get start of day in local timezone
 */
const startOfDay = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

/**
 * Helper: Get end of day in local timezone
 */
const endOfDay = (date: Date = new Date()): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

/**
 * GET /api/dashboard/financial-summary
 *
 * Returns accurate financial calculations:
 * - Total Revenue: Sum of all SUCCESSFUL payments
 * - Total Payable: Sum of all expenses
 * - Total Arrears: Sum of unpaid/partially paid client prices
 * - Today's Recovery: Payments received today (uses paymentDate)
 * - Today's Expense: Expenses recorded today (uses expense date)
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = admin.companyId;
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    // Execute all independent queries in parallel for maximum performance
    const [
      totalRevenueResult,
      totalPayableResult,
      arrearsClients,
      todaysRecoveryResult,
      todaysExpenseResult,
      pendingRecoveryResult,
      paymentsForPending,
    ] = await Promise.all([
      // 1. TOTAL REVENUE - Sum of all SUCCESSFUL payments (actual money received)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { companyId, status: 'success' },
      }),

      // 2. TOTAL PAYABLE - Sum of all expenses
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { companyId },
      }),

      // 3. TOTAL ARREARS - Sum of client prices where paymentStatus is 'unpaid' or 'partial'
      prisma.client.aggregate({
        _sum: { price: true },
        where: {
          companyId,
          paymentStatus: { in: ['unpaid', 'partial'] },
        },
      }),

      // 4. TODAY'S RECOVERY - Payments received today
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: todayStart, lte: todayEnd },
        },
      }),

      // 5. TODAY'S EXPENSE - Expenses recorded today
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          date: { gte: todayStart, lte: todayEnd },
        },
      }),

      // 6. PENDING RECOVERY - Aggregate invoice totals
      prisma.invoice.aggregate({
        where: {
          companyId,
          status: { in: ['unpaid', 'partial'] },
        },
        _sum: {
          totalAmount: true,
          amount: true,
          carryForwardAmount: true,
        },
      }),

      // 7. PAYMENTS for pending invoices - single optimized query
      prisma.payment.aggregate({
        where: {
          companyId,
          status: 'success',
          invoice: {
            status: { in: ['unpaid', 'partial'] },
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Compute derived values from parallel results
    const totalArrears = arrearsClients._sum.price || 0;
    const invoiceTotalSum = (pendingRecoveryResult._sum.totalAmount || pendingRecoveryResult._sum.amount || 0) + (pendingRecoveryResult._sum.carryForwardAmount || 0);
    const paymentsSum = paymentsForPending._sum.amount || 0;
    const pendingRecovery = Math.max(invoiceTotalSum - paymentsSum, 0);

    return NextResponse.json({
      totalRevenue: totalRevenueResult._sum.amount || 0,
      totalPayable: totalPayableResult._sum.amount || 0,
      totalArrears,
      pendingRecovery,
      todaysRecovery: todaysRecoveryResult._sum.amount || 0,
      todaysExpense: todaysExpenseResult._sum.amount || 0,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('[Financial Summary] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load financial summary' },
      { status: 500 }
    );
  }
}
