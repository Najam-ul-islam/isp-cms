import { NextResponse } from 'next/server';
import {
  calculateMonthlyRevenueAmount,
  performMonthlyRevenueRollover,
} from '@/modules/dashboard/services/revenue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, companyId, dryRun } = body;

    const configuredKey = process.env.ROLLOVER_API_KEY;
    if (configuredKey && apiKey !== configuredKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const revenueAmount = await calculateMonthlyRevenueAmount(companyId);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        companyId,
        revenueAmount,
        wouldRollOver: true,
      });
    }

    const result = await performMonthlyRevenueRollover(companyId, 'automatic');

    return NextResponse.json({
      ...result,
      dryRun: false,
    });
  } catch (error) {
    console.error('[Revenue Rollover Scheduler] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run revenue rollover' },
      { status: 500 }
    );
  }
}
