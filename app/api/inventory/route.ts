import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import {
  createInventoryItem,
  getInventory,
  getLowStockItems,
  getInventoryStats,
  updateStock
} from '../../../modules/inventory/services';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view inventory
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') || undefined;
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const search = searchParams.get('search') || undefined;

    const filters = {
      category,
      lowStockOnly,
      search
    };

    const inventory = await getInventory(admin, filters);

    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create inventory items
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    const { name, category, quantity, unitPrice } = body;

    // Validate required fields
    if (!name || !category || quantity === undefined || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, quantity, unitPrice' },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof unitPrice !== 'number' || unitPrice < 0) {
      return NextResponse.json(
        { error: 'Unit price must be a non-negative number' },
        { status: 400 }
      );
    }

    const item = await createInventoryItem(admin, {
      name,
      category,
      quantity,
      unitPrice
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Create inventory item error:', error);

    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('already exists')) {
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

// Additional endpoint for getting low stock items
export async function PUT(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update inventory
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'low-stock') {
      const lowStockItems = await getLowStockItems(admin);
      return NextResponse.json(lowStockItems);
    }

    if (action === 'update-stock') {
      const body = await request.json();
      const { itemId, type, quantity, note } = body;

      if (!itemId || !type || quantity === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields: itemId, type, quantity' },
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

      const result = await updateStock(admin, itemId, type, quantity, note);
      return NextResponse.json(result);
    }

    if (action === 'stats') {
      const stats = await getInventoryStats(admin);
      return NextResponse.json(stats);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=low-stock, ?action=update-stock, or ?action=stats' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Inventory PUT error:', error);

    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('not found') || errorMessage.includes('does not belong')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    if (errorMessage.includes('Insufficient stock')) {
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