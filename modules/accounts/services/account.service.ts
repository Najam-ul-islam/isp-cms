'use server';

import {
  createAccountLedger as createAccountLedgerRepo,
  createAccountTransaction as createAccountTransactionRepo,
  getAccountSummary as getAccountSummaryRepo,
  getAccountTransactions as getAccountTransactionsRepo,
  getAllAccountLedgers as getAllAccountLedgersRepo,
} from '../repository/account.repository';

import type { AccountType, TransactionKind } from '@prisma/client';
import { AccountSummary } from '../types/account.types';

// ✅ Correct parameter typing
export const createAccountLedger = async (data: {
  name: string;
  type: AccountType;
  description?: string;
  companyId: string;
}) => {
  return await createAccountLedgerRepo(data);
};

export const createAccountTransaction = async (data: {
  accountId: string;
  transactionType: TransactionKind;
  amount: number;
  description: string;
  reference?: string;
  companyId: string;
}) => {
  return await createAccountTransactionRepo(data);
};

export const getAccountSummary = async (companyId: string): Promise<AccountSummary> => {
  return await getAccountSummaryRepo(companyId);
};

export const getAccountTransactions = async (accountId: string) => {
  return await getAccountTransactionsRepo(accountId);
};

export const getAllAccountLedgers = async () => {
  return await getAllAccountLedgersRepo();
};







// // modules/accounts/services/account.service.ts
// 'use server';
// import {
//   createAccountLedger as createAccountLedgerRepo,
//   createAccountTransaction as createAccountTransactionRepo,
//   getAccountSummary as getAccountSummaryRepo,
//   getAccountTransactions as getAccountTransactionsRepo,
//   getAllAccountLedgers as getAllAccountLedgersRepo,
// } from '../repository/account.repository';
// import type { AccountType, TransactionKind } from '@prisma/client'; // ✅ Import Prisma enums
// import { AccountSummary } from '../types/account.types';

// // ✅ Service input types now match repository (using Prisma enums)
// export const createAccountLedger = async ( {
//   name: string;
//   type: AccountType; // ✅ Changed to Prisma's AccountType ('ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE')
//   description?: string;
// }) => {
//   return await createAccountLedgerRepo(data);
// };

// export const createAccountTransaction = async ( {
//   accountId: string;
//   transactionType: TransactionKind; // ✅ Changed to Prisma's TransactionKind ('DEBIT' | 'CREDIT' | 'PAYMENT' | etc.)
//   amount: number;
//   description: string;
//   reference?: string;
// }) => {
//   return await createAccountTransactionRepo(data);
// };

// export const getAccountSummary = async (): Promise<AccountSummary> => {
//   return await getAccountSummaryRepo();
// };

// export const getAccountTransactions = async (accountId: string) => {
//   return await getAccountTransactionsRepo(accountId);
// };

// export const getAllAccountLedgers = async () => {
//   return await getAllAccountLedgersRepo();
// };







// import {
//   createAccountLedger as createAccountLedgerRepo,
//   createAccountTransaction as createAccountTransactionRepo,
//   getAccountSummary as getAccountSummaryRepo,
//   getAccountTransactions as getAccountTransactionsRepo,
//   getAllAccountLedgers as getAllAccountLedgersRepo
// } from '../repository/account.repository';
// import { AccountSummary } from '../types/account.types';

// export const createAccountLedger = async (data: {
//   name: string;
//   type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
//   description?: string;
// }) => {
//   return await createAccountLedgerRepo(data);
// };

// export const createAccountTransaction = async (data: {
//   accountId: string;
//   transactionType: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   reference?: string;
// }) => {
//   return await createAccountTransactionRepo(data);
// };

// export const getAccountSummary = async (): Promise<AccountSummary> => {
//   return await getAccountSummaryRepo();
// };

// export const getAccountTransactions = async (accountId: string) => {
//   return await getAccountTransactionsRepo(accountId);
// };

// export const getAllAccountLedgers = async () => {
//   return await getAllAccountLedgersRepo();
// };