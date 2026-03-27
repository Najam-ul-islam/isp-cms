import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  getInventoryItemById,
  getItemTransactions
} from '../../../../modules/inventory/services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view inventory
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const itemId = id;

    const item = await getInventoryItemById(admin, itemId);

    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Get inventory item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update inventory
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const itemId = id;

    const body = await request.json();
    const { type, quantity, note } = body;

    // Validate required fields
    if (!type || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type, quantity' },
        { status: 400 }
      );
    }

    if (!['IN', 'OUT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be IN or OUT' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    // Import updateStock function here (need to import in the route)
    const { updateStock } = await import('../../../../modules/inventory/services');

    const result = await updateStock(admin, itemId, type, quantity, note);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Update inventory item error:', error);

    const errorMessage = (error as Error).message;

    if (errorMessage?.includes('not found') || errorMessage?.includes('does not belong')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    if (errorMessage?.includes('Insufficient stock')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}