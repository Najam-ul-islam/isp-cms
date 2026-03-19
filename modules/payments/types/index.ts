import { Payment } from '@prisma/client';

export type CreatePaymentInput = {
  clientId: string;
  amount: number;
  method?: string;
  notes?: string;
};

export type UpdatePaymentInput = {
  id: string;
  amount?: number;
  method?: string;
  notes?: string;
};

export type PaymentFilters = {
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  method?: string;
};

export type PaymentWithClient = Payment & {
  client: {
    id: string;
    name: string;
    phone: string;
  };
};