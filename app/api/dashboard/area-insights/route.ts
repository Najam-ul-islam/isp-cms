import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getAreaInsights } from '../../../../modules/areas/services';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to access area insights
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const insights = await getAreaInsights(admin.companyId);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Area insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to load area insights' },
      { status: 500 }
    );
  }
}