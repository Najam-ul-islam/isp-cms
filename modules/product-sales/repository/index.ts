import { prisma } from '@/lib/prisma';
import {
  CreateProductSaleInput,
  UpdateProductSaleInput,
  OtherIncomeFilters,
  ClientOtherIncomeBreakdown,
} from '../types';

/**
 * Create a new product sale record
 * Automatically deducts stock from inventory if product name matches an inventory item
 */
export const createProductSale = async (input: CreateProductSaleInput) => {
  const unitProfit = input.sellingPrice - input.actualPrice;
  const totalOtherIncome = unitProfit * input.quantity;

  // Use Prisma transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // 1. Create the product sale
    const productSale = await tx.productSale.create({
      data: {
        clientId: input.clientId,
        productName: input.productName,
        actualPrice: input.actualPrice,
        sellingPrice: input.sellingPrice,
        quantity: input.quantity,
        unitProfit,
        totalOtherIncome,
        notes: input.notes,
        saleDate: input.saleDate || new Date(),
        companyId: input.companyId,
      },
    });

    // 2. Find matching inventory item by name (case-insensitive)
    const inventoryItem = await tx.inventoryItem.findFirst({
      where: {
        companyId: input.companyId,
        name: {
          equals: input.productName,
          mode: 'insensitive',
        },
      },
    });

    // 3. If inventory item exists, deduct stock and create transaction
    if (inventoryItem) {
      // Check if enough stock is available
      if (inventoryItem.quantity < input.quantity) {
        throw new Error(
          `Insufficient stock for "${input.productName}". Available: ${inventoryItem.quantity}, Requested: ${input.quantity}`
        );
      }

      // Deduct quantity from inventory
      const newQuantity = inventoryItem.quantity - input.quantity;
      const newTotalValue = newQuantity * inventoryItem.unitPrice;

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: newQuantity,
          totalValue: newTotalValue,
        },
      });

      // Create inventory transaction record
      await tx.inventoryTransaction.create({
        data: {
          itemId: inventoryItem.id,
          type: 'sale',
          quantity: input.quantity,
          note: `Product sale - ${input.productName} (Qty: ${input.quantity})`,
          companyId: input.companyId,
        },
      });
    }

    return productSale;
  });
};

/**
 * Update an existing product sale record
 */
export const updateProductSale = async (input: UpdateProductSaleInput) => {
  const existing = await prisma.productSale.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new Error('ProductSale not found');
  }

  const actualPrice = input.actualPrice ?? existing.actualPrice;
  const sellingPrice = input.sellingPrice ?? existing.sellingPrice;
  const quantity = input.quantity ?? existing.quantity;

  const unitProfit = sellingPrice - actualPrice;
  const totalOtherIncome = unitProfit * quantity;

  return prisma.productSale.update({
    where: { id: input.id },
    data: {
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.productName !== undefined && { productName: input.productName }),
      actualPrice,
      sellingPrice,
      quantity,
      unitProfit,
      totalOtherIncome,
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.saleDate !== undefined && { saleDate: input.saleDate }),
    },
  });
};

/**
 * Delete a product sale record
 */
export const deleteProductSale = async (id: string, companyId: string) => {
  return prisma.productSale.deleteMany({
    where: { id, companyId },
  });
};

/**
 * Get total other income with optional filters
 */
export const getTotalOtherIncome = async (
  companyId: string,
  filters?: OtherIncomeFilters
) => {
  const whereClause: any = { companyId };

  if (filters?.startDate && filters?.endDate) {
    whereClause.saleDate = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  }

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  }

  const result = await prisma.productSale.aggregate({
    where: whereClause,
    _sum: { totalOtherIncome: true },
    _count: { id: true },
  });

  return {
    totalOtherIncome: result._sum.totalOtherIncome || 0,
    count: result._count.id || 0,
  };
};

/**
 * Get other income breakdown per client
 */
export const getOtherIncomeByClient = async (
  companyId: string,
  filters?: Omit<OtherIncomeFilters, 'clientId'>
): Promise<ClientOtherIncomeBreakdown[]> => {
  const whereClause: any = { companyId };

  if (filters?.startDate && filters?.endDate) {
    whereClause.saleDate = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  }

  const results = await prisma.productSale.groupBy({
    by: ['clientId'],
    where: whereClause,
    _sum: { totalOtherIncome: true },
    _count: { id: true },
  });

  // Fetch client names for each clientId
  const breakdown: ClientOtherIncomeBreakdown[] = [];

  for (const result of results) {
    let clientName: string | null = null;

    if (result.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: result.clientId },
        select: { name: true },
      });
      clientName = client?.name || null;
    }

    breakdown.push({
      clientId: result.clientId,
      clientName,
      totalOtherIncome: result._sum.totalOtherIncome || 0,
      count: result._count.id || 0,
    });
  }

  return breakdown;
};

/**
 * Get a single product sale by ID
 */
export const getProductSaleById = async (id: string, companyId: string) => {
  return prisma.productSale.findFirst({
    where: { id, companyId },
    include: {
      client: {
        select: { id: true, name: true, username: true },
      },
    },
  });
};

/**
 * List product sales with pagination
 */
export const listProductSales = async (
  companyId: string,
  options?: {
    page?: number;
    pageSize?: number;
    startDate?: Date;
    endDate?: Date;
    clientId?: string;
  }
) => {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const whereClause: any = { companyId };

  if (options?.startDate && options?.endDate) {
    whereClause.saleDate = {
      gte: options.startDate,
      lte: options.endDate,
    };
  }

  if (options?.clientId) {
    whereClause.clientId = options.clientId;
  }

  const [data, total] = await Promise.all([
    prisma.productSale.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.productSale.count({ where: whereClause }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
