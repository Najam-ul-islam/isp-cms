import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getMonthlyRecoveryStats } from '../../../../modules/dashboard/services/monthly-recovery';

export const revalidate = 300;

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const stats = await getMonthlyRecoveryStats(admin.companyId);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Monthly recovery stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load monthly recovery stats' },
      { status: 500 }
    );
  }
}