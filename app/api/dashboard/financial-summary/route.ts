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

    // Calculate today's date range in UTC (used for both recovery and expenses)
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    console.log('[Financial Summary] Query params:', {
      companyId,
      todayUTC: todayUTC.toISOString(),
      endOfTodayUTC: endOfTodayUTC.toISOString(),
      now: now.toISOString()
    });

    // Debug: Get all payments for this company to see what's in the database
    const allPayments = await prisma.payment.findMany({
      where: { companyId },
      orderBy: { paymentDate: 'desc' },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentDate: true,
        client: { select: { name: true } }
      }
    });

    console.log('[Financial Summary] Recent payments:', allPayments.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      paymentDate: p.paymentDate.toISOString(),
      client: p.client?.name
    })));

    // 4. TODAY'S RECOVERY - Payments received today
    const todaysRecoveryResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        status: 'success', // Only successful payments
        paymentDate: {
          gte: todayUTC,
          lte: endOfTodayUTC,
        },
      },
    });

    console.log('[Financial Summary] Today\'s recovery:', todaysRecoveryResult._sum.amount);

    // 5. TODAY'S EXPENSE - Expenses recorded today
    const todaysExpenseResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        companyId,
        date: {
          gte: todayUTC,
          lte: endOfTodayUTC,
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
