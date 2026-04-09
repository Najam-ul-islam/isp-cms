import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

export interface LedgerInfo {
  id: string;
  name: string;
  type: AccountType;
  companyId: string;
}

const DEFAULT_LEDGERS = [
  { name: "Cash", type: AccountType.ASSET, description: "Cash account" },
  { name: "Bank", type: AccountType.ASSET, description: "Bank account" },
  {
    name: "Accounts Receivable",
    type: AccountType.ASSET,
    description: "Money owed by clients",
  },
  { name: "Revenue", type: AccountType.INCOME, description: "Income account" },
  {
    name: "Expense",
    type: AccountType.EXPENSE,
    description: "Expense account",
  },
];

export async function initializeLedgers(companyId: string) {
  const createdLedgers: LedgerInfo[] = [];

  for (const ledger of DEFAULT_LEDGERS) {
    // Check if ledger exists
    const existing = await prisma.accountLedger.findFirst({
      where: {
        companyId,
        name: ledger.name,
      },
    });

    if (!existing) {
      try {
        const created = await prisma.accountLedger.create({
          data: {
            name: ledger.name,
            type: ledger.type,
            description: ledger.description,
            companyId,
            balance: 0,
          },
        });
        
        createdLedgers.push({
          id: created.id,
          name: created.name,
          type: created.type,
          companyId: created.companyId,
        });
      } catch (error: any) {
        // Ignore unique constraint errors (ledger was created by another concurrent request)
        if (error?.code !== 'P2002') {
          console.error(`Error creating ledger "${ledger.name}":`, error);
        }
        // Try to fetch the ledger that might have been created
        const nowExists = await prisma.accountLedger.findFirst({
          where: { companyId, name: ledger.name },
        });
        if (nowExists) {
          createdLedgers.push({
            id: nowExists.id,
            name: nowExists.name,
            type: nowExists.type,
            companyId: nowExists.companyId,
          });
        }
      }
    } else {
      createdLedgers.push({
        id: existing.id,
        name: existing.name,
        type: existing.type,
        companyId: existing.companyId,
      });
    }
  }

  return createdLedgers;
}

export async function getLedgerById(id: string) {
  return prisma.accountLedger.findUnique({
    where: { id },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });
}

export async function getLedgersByCompanyId(
  companyId: string,
  includeTransactions = false
) {
  return prisma.accountLedger.findMany({
    where: { companyId },
    include: includeTransactions
      ? {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        }
      : {
          _count: {
            select: { transactions: true },
          },
        },
    orderBy: { name: "asc" },
  });
}

export async function getLedgerByName(companyId: string, name: string) {
  return prisma.accountLedger.findFirst({
    where: { companyId, name },
  });
}

export async function getLedgerBalance(accountId: string): Promise<number> {
  const ledger = await prisma.accountLedger.findUnique({
    where: { id: accountId },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  if (!ledger) {
    throw new Error("Ledger not found");
  }

  return calculateLedgerBalance(ledger);
}

export function calculateLedgerBalance(ledger: {
  type: AccountType;
  transactions: Array<{ amount: number; transactionType: string }>;
}): number {
  const { type, transactions } = ledger;

  const totalDebits = transactions
    .filter((t) => t.transactionType === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCredits = transactions
    .filter((t) => t.transactionType === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  // For ASSET and EXPENSE accounts: Debit increases, Credit decreases
  // For INCOME, LIABILITY, EQUITY accounts: Credit increases, Debit decreases
  if (type === AccountType.ASSET || type === AccountType.EXPENSE) {
    return totalDebits - totalCredits;
  } else {
    return totalCredits - totalDebits;
  }
}

export async function getLedgerBalanceByType(
  companyId: string,
  accountType: AccountType
): Promise<number> {
  const ledgers = await prisma.accountLedger.findMany({
    where: { companyId, type: accountType },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return ledgers.reduce((sum, ledger) => {
    return sum + calculateLedgerBalance(ledger);
  }, 0);
}
