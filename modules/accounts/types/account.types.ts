// ✅ Use Prisma's generated types directly
import type { 
  AccountLedger as PrismaAccountLedger,
  AccountTransaction as PrismaAccountTransaction,
  AccountType,
  TransactionKind
} from '@prisma/client';

export type AccountLedger = PrismaAccountLedger;
export type AccountTransaction = PrismaAccountTransaction;
export type AccountLedgerType = AccountType; // 'ASSET' | 'LIABILITY' | ...
export type TransactionKindType = TransactionKind; // 'DEBIT' | 'CREDIT' | ...

export interface AccountSummary {
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
}

// // modules/accounts/types/account.types.ts
// import type { 
//   AccountType, 
//   TransactionKind,
//   AccountLedger as PrismaAccountLedger,
//   AccountTransaction as PrismaAccountTransaction 
// } from '@prisma/client';

// // ✅ Re-export Prisma types with your preferred names
// export type AccountLedger = PrismaAccountLedger;
// export type AccountTransaction = PrismaAccountTransaction;

// // ✅ Use Prisma's enum types directly
// export type AccountLedgerType = AccountType; // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
// export type TransactionKindType = TransactionKind; // 'DEBIT' | 'CREDIT' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT' | 'FEE'

// export interface AccountSummary {
//   totalReceivable: number;
//   totalPayable: number;
//   netBalance: number;
// }



// export interface AccountTransaction {
//   id: string;
//   accountId: string;
//   transactionType: 'debit' | 'credit';
//   amount: number;
//   description: string;
//   date: Date;
//   reference?: string | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface AccountLedger {
//   id: string;
//   name: string;
//   type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
//   balance: number;
//   description?: string | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface AccountSummary {
//   totalReceivable: number;
//   totalPayable: number;
//   netBalance: number;
// }