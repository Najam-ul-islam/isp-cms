import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getMonthlyClientStats } from '../../../../modules/dashboard/services/monthly-stats';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const historyMonths = Math.min(parseInt(searchParams.get('history') || '6'), 12);

    const stats = await getMonthlyClientStats(admin.companyId, historyMonths);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Monthly client stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load monthly stats' },
      { status: 500 }
    );
  }
}