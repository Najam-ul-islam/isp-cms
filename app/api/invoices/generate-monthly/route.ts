import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { generateMonthlyInvoicesForCompany } from '@/modules/invoices/services';

/**
 * POST /api/invoices/generate-monthly
 * Generate monthly invoices for all active clients in a company
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN and ADMIN can generate invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { billingMonth, applyCredits = true, carryForward = true } = body;

    if (!billingMonth) {
      return NextResponse.json(
        { error: 'billingMonth is required (format: "2026-04")' },
        { status: 400 }
      );
    }

    // Validate billing month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(billingMonth)) {
      return NextResponse.json(
        { error: 'billingMonth must be in format YYYY-MM (e.g., "2026-04")' },
        { status: 400 }
      );
    }

    // Generate invoices for all active clients
    const results = await generateMonthlyInvoicesForCompany(
      admin.companyId,
      billingMonth,
      {
        applyCredits,
        carryForward
      }
    );

    return NextResponse.json({
      message: `Generated ${results.success} invoices, skipped ${results.skipped}, failed ${results.failed}`,
      results
    });
  } catch (error: any) {
    console.error('Error generating monthly invoices:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate monthly invoices' },
      { status: 500 }
    );
  }
}
