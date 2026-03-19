import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { createPayment, getPayments, getPaymentById, updatePayment, deletePayment } from '../../../modules/payments/services';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const method = searchParams.get('method');

    const filters = {
      clientId: clientId || undefined,
      startDate,
      endDate,
      method: method || undefined,
    };

    const payments = await getPayments(filters);
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, amount, method, notes } = body;

    if (!clientId || !amount) {
      return NextResponse.json({ error: 'Client ID and amount are required' }, { status: 400 });
    }

    const payment = await createPayment({
      clientId,
      amount: parseFloat(amount),
      method,
      notes
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment' }, { status: 500 });
  }
}