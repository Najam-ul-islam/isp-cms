import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { QuotationService } from '@/modules/quotations/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const quotation = await QuotationService.sendQuotation(id, admin.companyId);

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error('Error sending quotation:', error);
    
    if (error.message.includes('Only pending quotations can be sent')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to send quotation' }, { status: 500 });
  }
}