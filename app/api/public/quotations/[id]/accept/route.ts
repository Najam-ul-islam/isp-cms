import { NextRequest, NextResponse } from 'next/server';
import { QuotationService } from '@/modules/quotations/services';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await QuotationService.acceptQuotation(id);

    if (result.invoice) {
      return NextResponse.json({
        message: 'Quotation accepted successfully',
        invoice: result.invoice,
        quotation: result.quotation,
      });
    } else {
      return NextResponse.json({
        message: 'Quotation already accepted',
        invoice: result.invoice,
        quotation: result.quotation,
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Error accepting quotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to accept quotation' }, { status: 500 });
  }
}