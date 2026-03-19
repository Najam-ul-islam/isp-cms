import { NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/jwt'
import { getDashboardStats } from '../../../../modules/dashboard/services'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request as any)

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getDashboardStats();

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500 }
    )
  }
}