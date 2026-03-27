import {prisma} from '@/lib/prisma';
import { CreateExpenseInput, UpdateExpenseInput, ExpenseFilters } from '../types';

export const createExpense = async (data: CreateExpenseInput, companyId: string) => {
  return await prisma.expense.create({
    data: {
      title: data.title,
      amount: data.amount,
      category: data.category,
      date: data.date || new Date(),
      description: data.description || '',
      receipt: data.receipt || '',
      companyId
    },
  });
};

export const getExpenseById = async (id: string) => {
  return await prisma.expense.findUnique({
    where: { id }
  });
};

export const getExpenses = async (filters?: ExpenseFilters, companyId?: string) => {
  const whereClause: any = {
    ...(companyId && { companyId })
  };

  if (filters?.category) {
    whereClause.category = filters.category;
  }

  if (filters?.startDate && filters?.endDate) {
    whereClause.date = {
      gte: filters.startDate,
      lte: filters.endDate,
    };
  } else if (filters?.startDate) {
    whereClause.date = {
      gte: filters.startDate,
    };
  } else if (filters?.endDate) {
    whereClause.date = {
      lte: filters.endDate,
    };
  }

  return await prisma.expense.findMany({
    where: whereClause,
    orderBy: {
      date: 'desc',
    }
  });
};

export const updateExpense = async (id: string, data: UpdateExpenseInput, companyId?: string) => {
  const whereClause: any = { id };
  if (companyId) {
    whereClause.companyId = companyId;
  }

  const { title, amount, category, date, description, receipt } = data;
  return await prisma.expense.update({
    where: whereClause,
    data: {
      ...(title !== undefined && { title }),
      ...(amount !== undefined && { amount }),
      ...(category !== undefined && { category }),
      ...(date !== undefined && { date }),
      ...(description !== undefined && { description }),
      ...(receipt !== undefined && { receipt }),
    },
  });
};

export const deleteExpense = async (id: string, companyId?: string) => {
  const whereClause: any = { id };
  if (companyId) {
    whereClause.companyId = companyId;
  }

  return await prisma.expense.delete({
    where: whereClause
  });
};

export const getExpenseStats = async (companyId: string, startDate?: Date, endDate?: Date) => {
  const whereClause: any = {
    companyId
  };

  if (startDate && endDate) {
    whereClause.date = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    whereClause.date = {
      gte: startDate,
    };
  } else if (endDate) {
    whereClause.date = {
      lte: endDate,
    };
  }

  return await prisma.expense.aggregate({
    where: whereClause,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });
};