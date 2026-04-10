export interface CreateProductSaleInput {
  clientId?: string | null;
  productName: string;
  actualPrice: number;
  sellingPrice: number;
  quantity: number;
  notes?: string | null;
  saleDate?: Date;
  companyId: string;
}

export interface UpdateProductSaleInput {
  id: string;
  clientId?: string | null;
  productName?: string;
  actualPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  notes?: string | null;
  saleDate?: Date;
}

export interface ProductSaleResult {
  id: string;
  clientId: string | null;
  productName: string;
  actualPrice: number;
  sellingPrice: number;
  quantity: number;
  unitProfit: number;
  totalOtherIncome: number;
  notes: string | null;
  saleDate: Date;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
}

export interface OtherIncomeSummary {
  totalOtherIncome: number;
  count: number;
}

export interface OtherIncomeFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
}

export interface ClientOtherIncomeBreakdown {
  clientId: string | null;
  clientName: string | null;
  totalOtherIncome: number;
  count: number;
}
