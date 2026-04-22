import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { createExpense, getExpenses } from '../../../modules/expenses/services';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to read expenses
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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

    const expenses = await getExpenses(admin, filters);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    
    console.log('[EXPENSE CREATE] Admin from token:', admin ? {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name
    } : null);
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized - Please login again' }, { status: 401 });
    }

    // Check if user has permission to create expenses
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      console.log('[EXPENSE CREATE] Forbidden - Role:', admin.role);
      return NextResponse.json({ error: `Insufficient permissions - Your role: ${admin.role}` }, { status: 403 });
    }

    const body = await request.json();
    const { title, amount, category, date, description, receipt } = body;

    if (!title || !amount || !category) {
      return NextResponse.json({ error: 'Title, amount, and category are required' }, { status: 400 });
    }

    const expense = await createExpense(admin, {
      title,
      amount: parseFloat(amount),
      category,
      date: date ? new Date(date) : undefined,
      description,
      receipt
    });

    // Emit real-time event for expense creation
    const { emitEvent } = await import('@/lib/sse-service');
    await emitEvent('expense_created', {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      createdAt: expense.createdAt,
    }, admin.companyId);

    return NextResponse.json(expense);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Failed to create expense' }, { status: 500 });
  }
}