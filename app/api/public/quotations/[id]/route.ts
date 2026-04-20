import { NextRequest, NextResponse } from 'next/server';
import { QuotationService } from '@/modules/quotations/services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await QuotationService.getPublicQuotation(id);

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      title: quotation.title,
      description: quotation.description,
      totalAmount: quotation.totalAmount,
      status: quotation.status,
      validUntil: quotation.validUntil,
      sentAt: quotation.sentAt,
      respondedAt: quotation.respondedAt,
      createdAt: quotation.createdAt,
      company: {
        name: quotation.company.name,
      },
      client: {
        name: quotation.client.name,
        phone: quotation.client.phone,
        cnic: quotation.client.cnic,
        city: quotation.client.city,
      },
      items: quotation.items,
    });
  } catch (error: any) {
    console.error('Error fetching public quotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch quotation' }, { status: 500 });
  }
}