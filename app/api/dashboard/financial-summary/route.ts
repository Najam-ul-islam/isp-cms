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

    // Calculate today's date range (local timezone)
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    // 1. TOTAL REVENUE - Sum of client prices WHERE client.paymentStatus = 'paid'
    const totalRevenueResult = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        companyId,
        paymentStatus: 'paid',
      },
    });

    // 2. TOTAL PAYABLE - Sum of all expenses
    const totalPayableResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
      },
    });

    // 3. TOTAL ARREARS - Sum of client prices where paymentStatus is 'unpaid' or 'partial'
    const arrearsClients = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        companyId,
        paymentStatus: {
          in: ['unpaid', 'partial'],
        },
      },
    });

    const totalArrears = arrearsClients._sum.price || 0;

    // 4. TODAY'S RECOVERY - Sum of successful payments where paymentDate is today
    // Uses paymentDate (NOT createdAt) to support backdated payments
    const todaysRecoveryResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        status: 'success',
        paymentDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 5. TODAY'S EXPENSE - Sum of expenses where date is today
    const todaysExpenseResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    return NextResponse.json({
      totalRevenue: totalRevenueResult._sum.price || 0,
      totalPayable: totalPayableResult._sum.amount || 0,
      totalArrears,
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
