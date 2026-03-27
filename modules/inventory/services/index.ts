import { prisma } from '@/lib/prisma';
import { AdminWithPackages } from '@/lib/jwt';
import { logAction } from '../../audit/services';

export interface InventoryItemInput {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

export interface InventoryTransactionInput {
  itemId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note?: string;
}

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (
  admin: AdminWithPackages,
  data: InventoryItemInput
) => {
  const item = await prisma.inventoryItem.create({
    data: {
      ...data,
      totalValue: data.quantity * data.unitPrice,
      companyId: admin.companyId
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'CREATE_INVENTORY_ITEM',
    entity: 'INVENTORY_ITEM',
    entityId: item.id,
    metadata: {
      itemName: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    },
    companyId: admin.companyId
  });

  return item;
};

/**
 * Update stock for an inventory item (add or remove items)
 */
export const updateStock = async (
  admin: AdminWithPackages,
  itemId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  note?: string
) => {
  // First, get the current item to validate it belongs to the company
  const currentItem = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      companyId: admin.companyId
    }
  });

  if (!currentItem) {
    throw new Error('Inventory item not found or does not belong to your company');
  }

  // Calculate new quantity based on type
  let newQuantity: number;
  let newTotalValue: number;

  if (type === 'IN') {
    newQuantity = currentItem.quantity + quantity;
  } else {
    if (currentItem.quantity < quantity) {
      throw new Error('Insufficient stock to remove');
    }
    newQuantity = currentItem.quantity - quantity;
  }

  // Update the item with new quantities
  const updatedItem = await prisma.inventoryItem.update({
    where: {
      id: itemId,
      companyId: admin.companyId
    },
    data: {
      quantity: newQuantity,
      totalValue: newQuantity * currentItem.unitPrice
    }
  });

  // Create a transaction record
  const transaction = await prisma.inventoryTransaction.create({
    data: {
      itemId,
      type,
      quantity,
      note: note || null,
      companyId: admin.companyId
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'UPDATE_STOCK',
    entity: 'INVENTORY_TRANSACTION',
    entityId: transaction.id,
    metadata: {
      itemId,
      type,
      quantity,
      note,
      previousQuantity: currentItem.quantity,
      newQuantity
    },
    companyId: admin.companyId
  });

  return {
    item: updatedItem,
    transaction
  };
};

/**
 * Get all inventory items for the company
 */
export const getInventory = async (
  admin: AdminWithPackages,
  filters?: {
    category?: string;
    lowStockOnly?: boolean;
    search?: string;
  }
) => {
  const whereClause: any = {
    companyId: admin.companyId
  };

  if (filters?.category) {
    whereClause.category = { contains: filters.category, mode: 'insensitive' };
  }

  if (filters?.lowStockOnly) {
    whereClause.quantity = { lt: 10 }; // Assuming items with less than 10 are low stock
  }

  if (filters?.search) {
    whereClause.name = { contains: filters.search, mode: 'insensitive' };
  }

  return await prisma.inventoryItem.findMany({
    where: whereClause,
    orderBy: {
      name: 'asc'
    }
  });
};

/**
 * Get items with low stock (less than 10 units)
 */
export const getLowStockItems = async (admin: AdminWithPackages) => {
  return await prisma.inventoryItem.findMany({
    where: {
      companyId: admin.companyId,
      quantity: { lt: 10 }
    },
    orderBy: {
      quantity: 'asc'
    }
  });
};

/**
 * Get inventory item by ID
 */
export const getInventoryItemById = async (
  admin: AdminWithPackages,
  itemId: string
) => {
  return await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      companyId: admin.companyId
    }
  });
};

/**
 * Get transactions for an inventory item
 */
export const getItemTransactions = async (
  admin: AdminWithPackages,
  itemId: string
) => {
  return await prisma.inventoryTransaction.findMany({
    where: {
      itemId,
      companyId: admin.companyId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Get inventory summary statistics
 */
export const getInventoryStats = async (admin: AdminWithPackages) => {
  const totalItems = await prisma.inventoryItem.count({
    where: {
      companyId: admin.companyId
    }
  });

  const lowStockItems = await prisma.inventoryItem.count({
    where: {
      companyId: admin.companyId,
      quantity: { lt: 10 }
    }
  });

  const totalValue = await prisma.inventoryItem.aggregate({
    where: {
      companyId: admin.companyId
    },
    _sum: {
      totalValue: true
    }
  });

  return {
    totalItems,
    lowStockItems,
    totalValue: totalValue._sum.totalValue || 0
  };
};