import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  getCurrentMonthRevenue,
  performMonthlyRevenueRollover,
  getRevenueHistory,
  getRevenueSummaryByPeriod,
  checkRevenueRolloverDone,
} from '@/modules/dashboard/services/revenue';
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

    if (action === 'history') {
      const limit = parseInt(url.searchParams.get('limit') || '12');
      const history = await getRevenueHistory(companyId, limit);
      return NextResponse.json({ history });
    }

    if (action === 'summary') {
      const now = new Date();
      const startYear = parseInt(url.searchParams.get('startYear') || String(now.getFullYear()));
      const startMonth = parseInt(url.searchParams.get('startMonth') || '1');
      const endYear = parseInt(url.searchParams.get('endYear') || String(now.getFullYear()));
      const endMonth = parseInt(url.searchParams.get('endMonth') || String(now.getMonth() + 1));

      const summary = await getRevenueSummaryByPeriod(
        companyId,
        startYear,
        startMonth,
        endYear,
        endMonth
      );
      return NextResponse.json({ summary });
    }

    if (action === 'status') {
      const now = new Date();
      const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()));
      const month = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1));
      const status = await checkRevenueRolloverDone(companyId, year, month);
      return NextResponse.json({
        currentPeriod: { year, month },
        ...status,
      });
    }

    const revenueData = await getCurrentMonthRevenue(companyId);
    const history = await getRevenueHistory(companyId, 12);

    return NextResponse.json(
      {
        ...revenueData,
        history,
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
    console.error('[Revenue API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve revenue data' },
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

      const result = await performMonthlyRevenueRollover(
        companyId,
        rolloverType,
        year,
        month
      );

      if (result.success && !result.alreadyRolledOver) {
        try {
          await emitEvent('revenue_update', {
            companyId,
            revenueAmount: result.revenueAmount,
            cumulativeRevenue: result.newCumulativeRevenue,
            year: result.year,
            month: result.month,
          }, companyId);
        } catch (e) {
          console.warn('[Revenue API] SSE update emit failed:', e);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Revenue API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process revenue action' },
      { status: 500 }
    );
  }
}
