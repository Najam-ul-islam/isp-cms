import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { getDashboardStats } from '../../../../modules/dashboard/services'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to access dashboard stats
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const stats = await getDashboardStats();

    // Ensure we return the new fields as well
  return NextResponse.json(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}