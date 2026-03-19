import { Expense } from '@prisma/client';

export type CreateExpenseInput = {
  title: string;
  amount: number;
  category: string;
  date?: Date;
  description?: string;
  receipt?: string;
};

export type UpdateExpenseInput = {
  id: string;
  title?: string;
  amount?: number;
  category?: string;
  date?: Date;
  description?: string;
  receipt?: string;
};

export type ExpenseFilters = {
  category?: string;
  startDate?: Date;
  endDate?: Date;
};

export type ExpenseWithDetails = Expense;