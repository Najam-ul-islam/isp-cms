import { NextRequest, NextResponse } from 'next/server';
import { QuotationService } from '@/modules/quotations/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const quotation = await QuotationService.rejectQuotation(id);

    return NextResponse.json({
      message: 'Quotation rejected successfully',
      quotation,
    });
  } catch (error: any) {
    console.error('Error rejecting quotation:', error);
    
    if (error.message.includes('Quotation must be in sent status to be rejected')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message || 'Failed to reject quotation' }, { status: 500 });
  }
}