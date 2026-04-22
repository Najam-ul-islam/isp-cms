import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  getCurrentMonthARrears,
  calculatePendingRecoveryForRollover,
  performMonthlyRollover,
  getArrearsHistory,
  getPendingClientsBreakdown,
  getArrearSummaryByPeriod,
  getCurrentBillingMonth,
  checkRolloverAlreadyDone,
} from '@/modules/dashboard/services/arrears';
import { emitEvent } from '@/lib/sse-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const billingMonth = getCurrentBillingMonth();

    if (action === 'history') {
      const limit = parseInt(url.searchParams.get('limit') || '12');
      const history = await getArrearsHistory(companyId, limit);
      return NextResponse.json({ history });
    }

    if (action === 'pending') {
      const pendingRecovery = await calculatePendingRecoveryForRollover(companyId);
      return NextResponse.json({ pendingRecovery });
    }

    if (action === 'breakdown') {
      const breakdown = await getPendingClientsBreakdown(companyId);
      return NextResponse.json({ breakdown });
    }

    if (action === 'summary') {
      const startYear = parseInt(url.searchParams.get('startYear') || String(billingMonth.year));
      const startMonth = parseInt(url.searchParams.get('startMonth') || String(billingMonth.month));

      const prev12 = billingMonth.month <= 12
        ? { year: billingMonth.year - (billingMonth.month === 12 ? 0 : 1), month: billingMonth.month === 12 ? 12 : billingMonth.month + (billingMonth.month <= 1 ? 0 : 0) }
        : { year: billingMonth.year - 1, month: billingMonth.month };

      const summary = await getArrearSummaryByPeriod(
        companyId,
        startYear,
        startMonth,
        billingMonth.year,
        billingMonth.month
      );
      return NextResponse.json({ summary });
    }

    if (action === 'status') {
      const status = await checkRolloverAlreadyDone(
        companyId,
        billingMonth.year,
        billingMonth.month
      );
      return NextResponse.json({
        currentPeriod: billingMonth,
        ...status,
      });
    }

    const arrearsData = await getCurrentMonthARrears(companyId);
    const history = await getArrearsHistory(companyId, 12);

    return NextResponse.json(
      {
        ...arrearsData,
        history,
        currentPeriod: billingMonth,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('[Arrears API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve arrears data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = admin.companyId;
    const body = await request.json();
    const { action } = body;

    if (action === 'rollover') {
      const rolloverType = body.type || 'manual';
      const year = body.year;
      const month = body.month;

      const result = await performMonthlyRollover(
        companyId,
        rolloverType,
        year,
        month
      );

      if (result.success) {
        try {
          await emitEvent('arrears_update', {
            companyId,
            totalArrears: result.newTotalArrears,
            pendingRecovery: result.pendingRecovery,
            year: result.year,
            month: result.month,
          }, companyId);
        } catch (e) {
          console.warn('[Arrears API] SSE update emit failed:', e);
        }
      }

      return NextResponse.json(result);
    }

    if (action === 'reset') {
      const { resetPendingRecoveryForNewMonth } = await import(
        '@/modules/dashboard/services/arrears'
      );
      const result = await resetPendingRecoveryForNewMonth(companyId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Arrears API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process arrears action' },
      { status: 500 }
    );
  }
}