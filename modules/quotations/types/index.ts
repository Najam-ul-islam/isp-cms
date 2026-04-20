import { QuotationStatus, Quotation, Client, Company, Invoice } from '@prisma/client';

export interface QuotationItemInput {
  name: string;
  description?: string;
  amount: number;
  quantity?: number;
}

export interface CreateQuotationInput {
  clientId: string;
  title?: string;
  description?: string;
  items: QuotationItemInput[];
  validUntil?: Date;
  idempotencyKey?: string;
}

export interface QuotationWithDetails extends Quotation {
  client: Client;
  company: Company;
  items: QuotationItemData[];
  invoice?: Invoice | null;
}

export interface QuotationItemData {
  id: string;
  quotationId: string;
  name: string;
  description: string | null;
  amount: number;
  quantity: number;
  createdAt: Date;
}

export interface QuotationFilters {
  status?: QuotationStatus;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PublicQuotationResponse {
  id: string;
  quotationNumber: string;
  title: string | null;
  description: string | null;
  totalAmount: number;
  status: QuotationStatus;
  validUntil: Date | null;
  sentAt: Date | null;
  respondedAt: Date | null;
  createdAt: Date;
  company: {
    name: string;
  };
  client: {
    name: string;
    phone: string;
    cnic: string;
    city: string;
  };
  items: QuotationItemData[];
}

export enum QUOTATION_STATUS {
  PENDING = 'pending',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}