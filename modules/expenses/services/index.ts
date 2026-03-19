import { CreateExpenseInput, UpdateExpenseInput, ExpenseFilters } from '../types';
import {
  createExpense as createExpenseRepo,
  getExpenseById as getExpenseByIdRepo,
  getExpenses as getExpensesRepo,
  updateExpense as updateExpenseRepo,
  deleteExpense as deleteExpenseRepo,
  getExpenseStats as getExpenseStatsRepo
} from '../repository';

export const createExpense = async (data: CreateExpenseInput) => {
  // Validate inputs
  if (!data.title) {
    throw new Error('Expense title is required');
  }

  if (data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!data.category) {
    throw new Error('Category is required');
  }

  return await createExpenseRepo(data);
};

export const getExpenseById = async (id: string) => {
  if (!id) {
    throw new Error('Expense ID is required');
  }

  return await getExpenseByIdRepo(id);
};

export const getExpenses = async (filters?: ExpenseFilters) => {
  return await getExpensesRepo(filters);
};

export const updateExpense = async (id: string, data: UpdateExpenseInput) => {
  if (!id) {
    throw new Error('Expense ID is required');
  }

  // Validate amount if provided
  if (data.amount !== undefined && data.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  return await updateExpenseRepo(id, data);
};

// ✅ Clean, correct signature
export const deleteExpense = async (id: string) => {
  if (!id) {
    throw new Error('Expense ID is required');
  }

  return await deleteExpenseRepo(id);
};
// export const deleteExpense = async (p0: { params: { id: string; }; }, p1: { params: { new(executor: (resolve: (value: { id: string; } | PromiseLike<{ id: string; }>) => void, reject: (reason?: any) => void) => void): Promise<{ id: string; }>; all<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>[]>; all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]>; }>; race<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>; race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>; readonly prototype: Promise<any>; reject<T = never>(reason?: any): Promise<T>; resolve(): Promise<void>; resolve<T>(value: T): Promise<Awaited<T>>; resolve<T>(value: T | PromiseLike<T>): Promise<Awaited<T>>; allSettled<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: PromiseSettledResult<Awaited<T[P]>>; }>; allSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>; any<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>; any<T>(values: Iterable<T | PromiseLike<T>>): Promise<Awaited<T>>; withResolvers<T>(): PromiseWithResolvers<T>; try<T, U extends unknown[]>(callbackFn: (...args: U) => T | PromiseLike<T>, ...args: U): Promise<Awaited<T>>; readonly [Symbol.species]: PromiseConstructor; }; }, id: string) => {
//   if (!id) {
//     throw new Error('Expense ID is required');
//   }

//   return await deleteExpenseRepo(id);
// };

export const getExpenseStats = async (startDate?: Date, endDate?: Date) => {
  return await getExpenseStatsRepo(startDate, endDate);
};