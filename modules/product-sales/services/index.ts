import "server-only";
import {
  CreateProductSaleInput,
  UpdateProductSaleInput,
  OtherIncomeFilters,
  ProductSaleResult,
  OtherIncomeSummary,
  ClientOtherIncomeBreakdown,
} from '../types';
import * as repository from '../repository';

/**
 * Validate input for creating a product sale
 */
const validateCreateInput = (input: CreateProductSaleInput) => {
  const errors: string[] = [];

  if (!input.productName || input.productName.trim().length === 0) {
    errors.push('productName is required');
  }

  if (input.actualPrice < 0 || Number.isNaN(input.actualPrice)) {
    errors.push('actualPrice must be >= 0');
  }

  if (input.sellingPrice < 0 || Number.isNaN(input.sellingPrice)) {
    errors.push('sellingPrice must be >= 0');
  }

  if (input.quantity < 1 || !Number.isInteger(input.quantity)) {
    errors.push('quantity must be an integer >= 1');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
};

/**
 * Create a new product sale with validation
 */
export const createProductSale = async (
  input: CreateProductSaleInput
): Promise<ProductSaleResult> => {
  validateCreateInput(input);
  return repository.createProductSale(input);
};

/**
 * Update an existing product sale with validation
 */
export const updateProductSale = async (
  input: UpdateProductSaleInput
): Promise<ProductSaleResult> => {
  const errors: string[] = [];

  if (input.actualPrice !== undefined && (input.actualPrice < 0 || Number.isNaN(input.actualPrice))) {
    errors.push('actualPrice must be >= 0');
  }

  if (input.sellingPrice !== undefined && (input.sellingPrice < 0 || Number.isNaN(input.sellingPrice))) {
    errors.push('sellingPrice must be >= 0');
  }

  if (input.quantity !== undefined && (input.quantity < 1 || !Number.isInteger(input.quantity))) {
    errors.push('quantity must be an integer >= 1');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return repository.updateProductSale(input);
};

/**
 * Delete a product sale record
 */
export const deleteProductSale = async (
  id: string,
  companyId: string
) => {
  return repository.deleteProductSale(id, companyId);
};

/**
 * Get total other income summary with optional date filters
 */
export const getOtherIncomeSummary = async (
  companyId: string,
  filters?: OtherIncomeFilters
): Promise<OtherIncomeSummary> => {
  return repository.getTotalOtherIncome(companyId, filters);
};

/**
 * Get other income breakdown per client
 */
export const getOtherIncomeByClient = async (
  companyId: string,
  filters?: Omit<OtherIncomeFilters, 'clientId'>
): Promise<ClientOtherIncomeBreakdown[]> => {
  return repository.getOtherIncomeByClient(companyId, filters);
};

/**
 * List product sales with pagination and filters
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
  return repository.listProductSales(companyId, options);
};

/**
 * Calculate unit profit for display purposes (without persisting)
 */
export const calculateUnitProfit = (
  actualPrice: number,
  sellingPrice: number
): number => {
  return sellingPrice - actualPrice;
};

/**
 * Calculate total other income for display purposes (without persisting)
 */
export const calculateTotalOtherIncome = (
  actualPrice: number,
  sellingPrice: number,
  quantity: number
): number => {
  const unitProfit = calculateUnitProfit(actualPrice, sellingPrice);
  return unitProfit * quantity;
};
