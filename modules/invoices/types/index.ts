// modules/invoices/types/index.ts

export interface InvoicePaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface InvoiceWithPayments {
  id: string;
  clientId: string;
  amount: number;
  issuedDate: Date;
  dueDate: Date;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: Date;
    method: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface CreateInvoiceDto {
  clientId: string;
  amount: number;
  dueDate: Date;
  description?: string;
}

export interface PaymentForInvoiceDto {
  clientId: string;
  invoiceId?: string; // Optional - if not provided, will use latest unpaid invoice
  amount: number;
  method?: string;
  notes?: string;
}