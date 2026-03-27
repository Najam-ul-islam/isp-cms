// modules/accounts/repository/account.repository.ts
'use server';
import { prisma } from '@/lib/prisma';
import type { AccountType, TransactionKind } from '@prisma/client';
import { AccountTransaction, AccountLedger, AccountSummary } from '../types/account.types';

// Input types for better IntelliSense
interface CreateAccountLedgerInput {
  name: string;
  type: AccountType;
  description?: string;
  companyId: string;
}

interface CreateAccountTransactionInput {
  accountId: string;
  transactionType: TransactionKind;
  amount: number;
  description: string;
  reference?: string;
  companyId: string;
}

export const createAccountLedger = async (
  data: CreateAccountLedgerInput  // ✅ Fixed: Added "data:" parameter name
): Promise<AccountLedger> => {
  return await prisma.accountLedger.create({
    data: {
      name: data.name,      // ✅ Now 'data' is defined
      type: data.type,
      description: data.description || '',
      balance: 0,
      companyId: data.companyId,
    },
  });
};

export const createAccountTransaction = async (
  data: CreateAccountTransactionInput  // ✅ Fixed: Added "data:" parameter name
): Promise<AccountTransaction> => {
  return await prisma.accountTransaction.create({
    data: {
      accountId: data.accountId,
      transactionType: data.transactionType,
      amount: data.amount,
      description: data.description,
      reference: data.reference,
      companyId: data.companyId,
    },
  });
};

export const getAccountSummary = async (companyId: string): Promise<AccountSummary> => {
  const totalReceivable = await prisma.accountTransaction.aggregate({
    _sum: { amount: true },
    where: {
      transactionType: 'CREDIT',
      account: {
        companyId
      }
    },
  });

  const totalPayable = await prisma.accountTransaction.aggregate({
    _sum: { amount: true },
    where: {
      transactionType: 'DEBIT',
      account: {
        companyId
      }
    },
  });

  return {
    totalReceivable: totalReceivable._sum.amount || 0,
    totalPayable: totalPayable._sum.amount || 0,
    netBalance: (totalReceivable._sum.amount || 0) - (totalPayable._sum.amount || 0),
  };
};

export const getAccountTransactions = async (accountId: string) => {
  return await prisma.accountTransaction.findMany({
    where: { accountId },
    orderBy: { date: 'desc' },
    take: 10,
  });
};

export const getAllAccountLedgers = async () => {
  return await prisma.accountLedger.findMany();
};



// // modules/accounts/repository/account.repository.ts
// 'use server';
// import { prisma } from '@/lib/prisma';
// import type { AccountType, TransactionKind } from '@prisma/client'; // ✅ Import Prisma enums
// import { AccountTransaction, AccountLedger, AccountSummary, AccountLedgerType } from '../types/account.types';

// export const createAccountLedger = async ( {
//   name: string;
//   type: AccountLedgerType; // ✅ Now accepts: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
//   description?: string;
// }): Promise<AccountLedger> => {
//   return await prisma.accountLedger.create({
//      {
//       name: data.name,
//       type: data.type, // ✅ Type-safe: matches Prisma schema exactly
//       description: data.description || '',
//       balance: 0,
//     },
//   });
// };

// export const createAccountTransaction = async ( {
//   accountId: string;
//   transactionType: TransactionKind; // ✅ 'DEBIT' | 'CREDIT' | 'PAYMENT' | etc.
//   amount: number;
//   description: string;
//   reference?: string;
// }): Promise<AccountTransaction> => {
//   return await prisma.accountTransaction.create({
//      {
//       accountId: data.accountId,
//       transactionType: data.transactionType,
//       amount: data.amount,
//       description: data.description,
//       reference: data.reference,
//     },
//   });
// };

// export const getAccountSummary = async (): Promise<AccountSummary> => {
//   const totalReceivable = await prisma.accountTransaction.aggregate({
//     _sum: { amount: true },
//     where: { transactionType: 'CREDIT' }, // ✅ Use uppercase enum value
//   });

//   const totalPayable = await prisma.accountTransaction.aggregate({
//     _sum: { amount: true },
//     where: { transactionType: 'DEBIT' }, // ✅ Use uppercase enum value
//   });

//   return {
//     totalReceivable: totalReceivable._sum.amount || 0,
//     totalPayable: totalPayable._sum.amount || 0,
//     netBalance: (totalReceivable._sum.amount || 0) - (totalPayable._sum.amount || 0),
//   };
// };

// export const getAccountTransactions = async (accountId: string) => {
//   return await prisma.accountTransaction.findMany({
//     where: { accountId },
//     orderBy: { date: 'desc' },
//     take: 10,
//   });
// };

// export const getAllAccountLedgers = async () => {
//   return await prisma.accountLedger.findMany();
// };



// 'use server';
// import {prisma} from '@/lib/prisma';
// import { AccountTransaction, AccountLedger, AccountSummary } from '../types/account.types';

// export const createAccountLedger = async (data: {
//   name: string;
//   type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
//   description?: string;
// }): Promise<AccountLedger> => {
//   return await prisma.accountLedger.create({
//     data: {
//       name: data.name,
//       type: data.type,
//       description: data.description || '',
//       balance: 0,
//     },
//   });
// };

// export const createAccountTransaction = async (data: {
//   accountId: string;
//   transactionType: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   reference?: string;
// }): Promise<AccountTransaction> => {
//   return await prisma.accountTransaction.create({
//     data: {
//       accountId: data.accountId,
//       transactionType: data.transactionType,
//       amount: data.amount,
//       description: data.description,
//       reference: data.reference,
//     },
//   });
// };

// export const getAccountSummary = async (): Promise<AccountSummary> => {
//   // Calculate total receivables (credits to accounts)
//   const totalReceivable = await prisma.accountTransaction.aggregate({
//     _sum: {
//       amount: true,
//     },
//     where: {
//       transactionType: 'credit',
//     },
//   });

//   // Calculate total payables (debits to accounts)
//   const totalPayable = await prisma.accountTransaction.aggregate({
//     _sum: {
//       amount: true,
//     },
//     where: {
//       transactionType: 'debit',
//     },
//   });

//   return {
//     totalReceivable: totalReceivable._sum.amount || 0,
//     totalPayable: totalPayable._sum.amount || 0,
//     netBalance: (totalReceivable._sum.amount || 0) - (totalPayable._sum.amount || 0),
//   };
// };

// export const getAccountTransactions = async (accountId: string) => {
//   return await prisma.accountTransaction.findMany({
//     where: {
//       accountId,
//     },
//     orderBy: {
//       date: 'desc',
//     },
//     take: 10,
//   });
// };

// export const getAllAccountLedgers = async () => {
//   return await prisma.accountLedger.findMany();
// };