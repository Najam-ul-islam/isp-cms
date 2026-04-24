import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { FinancialService } from '@/lib/financial-service';
import { getCurrentMonthARrears } from '@/modules/dashboard/services/arrears';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PAKISTAN_TIMEZONE = 'Asia/Karachi';

/**
 * GET /api/dashboard/financial-summary
 *
 * Profit-based revenue system:
 * - "Paid client" = has a successful package payment THIS MONTH (verified from payments table)
 * - Package Margin = SUM(client.price - package.purchasePrice) for paid clients only
 * - Other Income = SUM((sellingPrice - costPrice) * quantity) from ProductSale this month
 * - Total Revenue = Package Margin + Other Income
 * - Payments determine STATUS (who paid), NOT VALUE (how much revenue)
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = admin.companyId;
    const todayStart = dayjs().tz(PAKISTAN_TIMEZONE).startOf('day').toDate();
    const todayEnd = dayjs().tz(PAKISTAN_TIMEZONE).endOf('day').toDate();
    const monthStart = dayjs().tz(PAKISTAN_TIMEZONE).startOf('month').toDate();
    const monthEnd = dayjs().tz(PAKISTAN_TIMEZONE).endOf('month').toDate();

    // Step 1: Get paid client IDs + revenue in parallel with other independent queries
    const [
      revenueData,
      arrearsData,
      totalPayableResult,
      todaysPackageRecoveryResult,
      todaysOtherIncomeResult,
      todaysExpenseResult,
      totalPackageValue,
      totalPaidForPackages,
    ] = await Promise.all([
      // TOTAL REVENUE — invoice-verified paid clients margin + product profit
      FinancialService.calculateTotalRevenue(companyId, monthStart, monthEnd),

      // ARREARS
      getCurrentMonthARrears(companyId),

      // TOTAL PAYABLE — sum of all expenses
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { companyId },
      }),

      // TODAY'S PACKAGE RECOVERY — internet package payments only
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: todayStart, lte: todayEnd },
          invoice: { source: 'package' },
        },
      }),

      // TODAY'S OTHER INCOME — non-package payments
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: todayStart, lte: todayEnd },
          invoice: { source: { not: 'package' } },
        },
      }),

      // TODAY'S EXPENSE
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // PENDING RECOVERY — total package value from active/expired clients
      prisma.client.aggregate({
        _sum: { price: true },
        where: {
          companyId,
          status: { in: ['active', 'expired'] },
        },
      }),

      // PENDING RECOVERY — total paid for packages THIS MONTH
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          status: 'success',
          paymentDate: { gte: monthStart, lte: monthEnd },
          invoice: { source: 'package' },
        },
      }),
    ]);

    const pendingRecovery = Math.max(
      (totalPackageValue._sum.price || 0) - (totalPaidForPackages._sum.amount || 0),
      0
    );

    const todaysPackageRecovery = todaysPackageRecoveryResult._sum.amount || 0;
    const todaysOtherIncome = todaysOtherIncomeResult._sum.amount || 0;

    return NextResponse.json({
      totalRevenue: revenueData.totalRevenue,
      packageMargin: revenueData.packageMargin,
      otherIncome: revenueData.otherIncome,
      paidClientCount: revenueData.paidClientCount,
      totalPayable: totalPayableResult._sum.amount || 0,
      totalArrears: arrearsData.totalArrears ?? 0,
      pendingRecovery,
      todaysPackageRecovery,
      todaysOtherIncome,
      todaysRecovery: todaysPackageRecovery + todaysOtherIncome,
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
