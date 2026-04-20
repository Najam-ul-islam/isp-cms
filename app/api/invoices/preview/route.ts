import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { getInvoicePreview } from '@/modules/invoices/services';

/**
 * GET /api/invoices/preview
 * Get invoice preview for a client before generation
 * 
 * Query params:
 *   - clientId: string (required)
 *   - billingMonth: string (required, format: "2026-04")
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only ADMIN can preview invoices
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const billingMonth = searchParams.get('billingMonth');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    if (!billingMonth) {
      return NextResponse.json({ error: 'billingMonth is required (format: "2026-04")' }, { status: 400 });
    }

    // Validate billing month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(billingMonth)) {
      return NextResponse.json({ error: 'billingMonth must be in format YYYY-MM' }, { status: 400 });
    }

    const preview = await getInvoicePreview(clientId, billingMonth);

    return NextResponse.json(preview);
  } catch (error: any) {
    console.error('Error generating invoice preview:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice preview' },
      { status: 500 }
    );
  }
}