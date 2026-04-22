import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { getCurrentMonthARrears } from '@/modules/dashboard/services/arrears';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching

const PAKISTAN_TIMEZONE = 'Asia/Karachi';

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
    const todayStart = dayjs().tz(PAKISTAN_TIMEZONE).startOf('day').toDate();
    const todayEnd = dayjs().tz(PAKISTAN_TIMEZONE).endOf('day').toDate();
    const monthStart = dayjs().tz(PAKISTAN_TIMEZONE).startOf('month').toDate();
    const monthEnd = dayjs().tz(PAKISTAN_TIMEZONE).endOf('month').toDate();

    const arrearsData = await getCurrentMonthARrears(companyId);

    // Execute all independent queries in parallel for maximum performance
    const [
      totalRevenueResult,
      totalPayableResult,
      todaysPackageRecoveryResult,
      todaysOtherIncomeResult,
      todaysExpenseResult,
      totalPackageValue,
      totalPaidForPackages,
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

      // 3. TODAY'S PACKAGE RECOVERY - Internet package payments only (via invoice.source = package)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: todayStart, lte: todayEnd },
          invoice: {
            source: 'package',
          },
        },
      }),

      // 4b. TODAY'S OTHER INCOME - Non-package payments (product_sale, manual, etc.)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: todayStart, lte: todayEnd },
          invoice: {
            source: { not: 'package' },
          },
        },
      }),

      // 5. TODAY'S EXPENSE - Expenses recorded today (use createdAt, not user-selected date)
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // 6. PENDING RECOVERY - Total package value from all active/expired clients
      prisma.client.aggregate({
        _sum: { price: true },
        where: {
          companyId,
          status: { in: ['active', 'expired'] },
        },
      }),

      // 7. PENDING RECOVERY - Total paid for packages THIS MONTH only
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: monthStart, lte: monthEnd },
          invoice: {
            source: 'package',
          },
        },
      }),
    ]);

    // Pending Recovery = total owed for packages - total paid for packages
    const pendingRecovery = Math.max(
      (totalPackageValue._sum.price || 0) - (totalPaidForPackages._sum.amount || 0),
      0
    );

    // Total Arrears = only from MonthlyArrears rollover history.
    // First month has no previous arrears, so it starts at 0.
    // Arrears accumulate only after a month-end rollover adds pending recovery.
    const cumulativeTotalArrears = arrearsData.totalArrears ?? 0;

    // Today's package recovery = internet package payments only
    // Today's other income = non-package payments (product sales, manual, etc.)
    const todaysPackageRecovery = todaysPackageRecoveryResult._sum.amount || 0;
    const todaysOtherIncome = todaysOtherIncomeResult._sum.amount || 0;
    // Total recovery = all successful payments today (package + other income)
    const todaysRecovery = todaysPackageRecovery + todaysOtherIncome;

    return NextResponse.json({
      totalRevenue: totalRevenueResult._sum.amount || 0,
      totalPayable: totalPayableResult._sum.amount || 0,
      totalArrears: cumulativeTotalArrears,
      pendingRecovery,
      todaysPackageRecovery,
      todaysOtherIncome,
      todaysRecovery,
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
