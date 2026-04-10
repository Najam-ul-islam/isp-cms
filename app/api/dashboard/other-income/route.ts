import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/secure-jwt';
import { getOtherIncomeSummary } from '@/modules/product-sales/services';

/**
 * GET /api/dashboard/other-income
 * 
 * Returns the total other income from product/device sales.
 * Supports optional date filtering via query parameters:
 *   - startDate: ISO date string
 *   - endDate: ISO date string
 * 
 * Response:
 * {
 *   totalOtherIncome: number,
 *   count: number,
 *   startDate?: string,
 *   endDate?: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO date string.' },
          { status: 400 }
        );
      }
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO date string.' },
          { status: 400 }
        );
      }
    }

    // Build filters
    const filters = {
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    const summary = await getOtherIncomeSummary(admin.companyId, filters);

    return NextResponse.json({
      totalOtherIncome: summary.totalOtherIncome,
      count: summary.count,
      ...(startDate && { startDate: startDate.toISOString() }),
      ...(endDate && { endDate: endDate.toISOString() }),
    });
  } catch (error) {
    console.error('[OtherIncome API] Error:', error);

    if (error instanceof Error && error.message.startsWith('Validation failed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
