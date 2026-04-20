import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { QuotationService } from '@/modules/quotations/services';
import { QuotationStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const quotation = await QuotationService.getQuotationById(id, admin.companyId);

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error('Error fetching quotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotation' }, { status: 500 });
  }
}

export async function DELETE(
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

    await QuotationService.deleteQuotation(id, admin.companyId);

    return NextResponse.json({ message: 'Quotation deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting quotation:', error);
    
    if (error.message.includes('Only pending quotations can be deleted')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to delete quotation' }, { status: 500 });
  }
}