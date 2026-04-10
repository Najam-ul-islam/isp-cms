import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable caching

/**
 * GET /api/dashboard/financial-summary
 *
 * Returns accurate financial calculations:
 * - Total Revenue: Sum of all SUCCESSFUL payments
 * - Total Payable: Sum of all expenses
 * - Total Arrears: Sum of unpaid/partially paid client prices
 * - Today's Recovery: Payments received today
 * - Today's Expense: Expenses recorded today
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

    // 1. TOTAL REVENUE - Money actually received from clients
    // Sum of client prices WHERE client.paymentStatus = 'paid'
    const totalRevenueResult = await prisma.client.aggregate({
      _sum: { price: true },
      where: {
        companyId,
        paymentStatus: 'paid', // Clients who have paid
      },
    });

    // 2. TOTAL PAYABLE - Money owed (expenses/liabilities)
    const totalPayableResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
      },
    });

    // 3. TOTAL ARREARS - Money customers still owe us
    // Sum of client prices where paymentStatus is 'unpaid' or 'partial'
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

    // 4. TODAY'S RECOVERY - Payments received today
    // Use payment table for accurate daily tracking
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const todaysRecoveryResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        status: 'success', // Only successful payments
        paymentDate: {
          gte: today,
          lte: endOfToday,
        },
      },
    });

    // 5. TODAY'S EXPENSE - Expenses recorded today
    const todaysExpenseResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        date: {
          gte: today,
          lte: endOfToday,
        },
      },
    });

    return NextResponse.json({
      totalRevenue: totalRevenueResult._sum.price || 0,
      totalPayable: totalPayableResult._sum.amount || 0,
      totalArrears,
      todaysRecovery: todaysRecoveryResult._sum.amount || 0,
      todaysExpense: todaysExpenseResult._sum.amount || 0,
      timestamp: new Date().toISOString(), // Add timestamp for cache busting
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Financial summary error:', error);
    return NextResponse.json(
      { error: 'Failed to load financial summary' },
      { status: 500 }
    );
  }
}
