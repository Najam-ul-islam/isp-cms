import { NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import {
  getInventoryItemById,
  getItemTransactions,
  updateStock
} from '../../../../modules/inventory/services';
import { logAction } from '../../../../modules/audit/services';

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
    
    // Check if this is a stock update (IN/OUT) or full item update
    if (body.type && ['IN', 'OUT'].includes(body.type)) {
      // Stock update operation
      const { type, quantity, note } = body;

      if (!type || quantity === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields: type, quantity' },
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
    } else {
      // Full item update
      const { name, category, quantity, unitPrice } = body;

      // Validate required fields
      if (!name && !category && quantity === undefined && !unitPrice) {
        return NextResponse.json(
          { error: 'At least one field must be provided: name, category, quantity, unitPrice' },
          { status: 400 }
        );
      }

      // Verify item exists and belongs to company
      const existingItem = await prisma.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!existingItem) {
        return NextResponse.json(
          { error: 'Inventory item not found' },
          { status: 404 }
        );
      }

      if (existingItem.companyId !== admin.companyId) {
        return NextResponse.json(
          { error: 'Item does not belong to your company' },
          { status: 403 }
        );
      }

      // Build update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (category) updateData.category = category;
      if (quantity !== undefined) {
        if (typeof quantity !== 'number' || quantity < 0) {
          return NextResponse.json(
            { error: 'Quantity must be a non-negative number' },
            { status: 400 }
          );
        }
        updateData.quantity = quantity;
        updateData.totalValue = quantity * (unitPrice || existingItem.unitPrice);
      }
      if (unitPrice !== undefined) {
        if (typeof unitPrice !== 'number' || unitPrice < 0) {
          return NextResponse.json(
            { error: 'Unit price must be a non-negative number' },
            { status: 400 }
          );
        }
        updateData.unitPrice = unitPrice;
        updateData.totalValue = (quantity !== undefined ? quantity : existingItem.quantity) * unitPrice;
      }

      // Update the item
      const updatedItem = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: updateData
      });

      // Log the update
      await logAction({
        userId: admin.id,
        action: 'UPDATE_INVENTORY_ITEM',
        entity: 'INVENTORY',
        entityId: updatedItem.id,
        metadata: {
          itemName: updatedItem.name,
          updatedFields: Object.keys(updateData)
        },
        companyId: admin.companyId
      });

      return NextResponse.json(updatedItem);
    }
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to delete inventory
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const itemId = id;

    // Verify item exists and belongs to company
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        transactions: true
      }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (existingItem.companyId !== admin.companyId) {
      return NextResponse.json(
        { error: 'Item does not belong to your company' },
        { status: 403 }
      );
    }

    // Delete associated transactions first
    if (existingItem.transactions.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { itemId }
      });
    }

    // Delete the item
    await prisma.inventoryItem.delete({
      where: { id: itemId }
    });

    // Log the deletion
    await logAction({
      userId: admin.id,
      action: 'DELETE_INVENTORY_ITEM',
      entity: 'INVENTORY',
      entityId: itemId,
      metadata: {
        itemName: existingItem.name,
        quantity: existingItem.quantity,
        totalValue: existingItem.totalValue
      },
      companyId: admin.companyId
    });

    return NextResponse.json({ 
      message: 'Inventory item deleted successfully',
      deletedItem: existingItem
    });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}