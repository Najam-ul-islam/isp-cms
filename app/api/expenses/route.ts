import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { createExpense, getExpenses } from '../../../modules/expenses/services';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;

    const filters = {
      category: category || undefined,
      startDate,
      endDate,
    };

    const expenses = await getExpenses(filters);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request as any);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, amount, category, date, description, receipt } = body;

    if (!title || !amount || !category) {
      return NextResponse.json({ error: 'Title, amount, and category are required' }, { status: 400 });
    }

    const expense = await createExpense({
      title,
      amount: parseFloat(amount),
      category,
      date: date ? new Date(date) : undefined,
      description,
      receipt
    });

    return NextResponse.json(expense);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
}