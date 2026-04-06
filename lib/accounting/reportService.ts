import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";
import { calculateLedgerBalance } from "./ledgerService";

export interface BalanceSheet {
  assets: {
    cash: number;
    bank: number;
    accountsReceivable: number;
    total: number;
  };
  income: {
    revenue: number;
    total: number;
  };
  expenses: {
    total: number;
  };
  netWorth: number;
}

export interface ProfitLoss {
  revenue: number;
  expenses: number;
  netProfit: number;
  period: {
    start?: string;
    end?: string;
  };
}

export interface CashFlow {
  openingBalance: number;
  cashInflows: number;
  cashOutflows: number;
  closingBalance: number;
  netCashFlow: number;
  period: {
    start?: string;
    end?: string;
  };
}

export async function getBalanceSheet(companyId: string): Promise<BalanceSheet> {
  const ledgers = await prisma.accountLedger.findMany({
    where: { companyId },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  const cashLedger = ledgers.find((l) => l.name === "Cash");
  const bankLedger = ledgers.find((l) => l.name === "Bank");
  const arLedger = ledgers.find((l) => l.name === "Accounts Receivable");

  const cash = cashLedger ? calculateLedgerBalance(cashLedger) : 0;
  const bank = bankLedger ? calculateLedgerBalance(bankLedger) : 0;
  const accountsReceivable = arLedger ? calculateLedgerBalance(arLedger) : 0;

  const totalAssets = cash + bank + accountsReceivable;

  const revenueLedgers = ledgers.filter((l) => l.type === AccountType.INCOME);
  const expenseLedgers = ledgers.filter((l) => l.type === AccountType.EXPENSE);

  const revenue = revenueLedgers.reduce(
    (sum, ledger) => sum + calculateLedgerBalance(ledger),
    0
  );

  const expenses = expenseLedgers.reduce(
    (sum, ledger) => sum + calculateLedgerBalance(ledger),
    0
  );

  return {
    assets: {
      cash,
      bank,
      accountsReceivable,
      total: totalAssets,
    },
    income: {
      revenue,
      total: revenue,
    },
    expenses: {
      total: expenses,
    },
    netWorth: totalAssets - expenses,
  };
}

export async function getProfitLoss(
  companyId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<ProfitLoss> {
  const { startDate, endDate } = options || {};

  const where = {
    companyId,
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const transactions = await prisma.accountTransaction.findMany({
    where,
    include: {
      account: true,
    },
  });

  const revenueTransactions = transactions.filter(
    (t) => t.account.type === AccountType.INCOME && t.transactionType === "CREDIT"
  );

  const expenseTransactions = transactions.filter(
    (t) => t.account.type === AccountType.EXPENSE && t.transactionType === "DEBIT"
  );

  const revenue = revenueTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const expenses = expenseTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

export async function getCashFlow(
  companyId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<CashFlow> {
  const { startDate, endDate } = options || {};

  const where = {
    companyId,
    account: {
      OR: [{ name: "Cash" }, { name: "Bank" }],
    },
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const transactions = await prisma.accountTransaction.findMany({
    where,
    include: {
      account: true,
    },
  });

  const cashInflows = transactions
    .filter((t) => t.transactionType === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOutflows = transactions
    .filter((t) => t.transactionType === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = cashInflows - cashOutflows;

  // Calculate opening balance (before start date)
  const openingWhere = {
    companyId,
    account: {
      OR: [{ name: "Cash" }, { name: "Bank" }],
    },
    ...(startDate && {
      date: {
        lt: new Date(startDate),
      },
    }),
  };

  const openingTransactions = await prisma.accountTransaction.findMany({
    where: openingWhere,
    include: {
      account: true,
    },
  });

  const openingDebits = openingTransactions
    .filter((t) => t.transactionType === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const openingCredits = openingTransactions
    .filter((t) => t.transactionType === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const openingBalance = openingDebits - openingCredits;
  const closingBalance = openingBalance + netCashFlow;

  return {
    openingBalance,
    cashInflows,
    cashOutflows,
    closingBalance,
    netCashFlow,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

export async function getAccountSummary(companyId: string) {
  const ledgers = await prisma.accountLedger.findMany({
    where: { companyId },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  const summary = ledgers.map((ledger) => ({
    id: ledger.id,
    name: ledger.name,
    type: ledger.type,
    balance: calculateLedgerBalance(ledger),
    transactionCount: ledger.transactions.length,
  }));

  return summary;
}

export async function getDashboardMetrics(companyId: string) {
  const balanceSheet = await getBalanceSheet(companyId);
  const profitLoss = await getProfitLoss(companyId);

  return {
    cashBalance: balanceSheet.assets.cash,
    bankBalance: balanceSheet.assets.bank,
    revenue: profitLoss.revenue,
    expenses: profitLoss.expenses,
    profit: profitLoss.netProfit,
    receivables: balanceSheet.assets.accountsReceivable,
  };
}

export async function getCashBalance(companyId: string): Promise<number> {
  const cashLedger = await prisma.accountLedger.findFirst({
    where: { companyId, name: "Cash" },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return cashLedger ? calculateLedgerBalance(cashLedger) : 0;
}

export async function getBankBalance(companyId: string): Promise<number> {
  const bankLedger = await prisma.accountLedger.findFirst({
    where: { companyId, name: "Bank" },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return bankLedger ? calculateLedgerBalance(bankLedger) : 0;
}

export async function getTotalRevenue(companyId: string): Promise<number> {
  const revenueLedgers = await prisma.accountLedger.findMany({
    where: { companyId, type: AccountType.INCOME },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return revenueLedgers.reduce((sum, ledger) => {
    return sum + calculateLedgerBalance(ledger);
  }, 0);
}

export async function getTotalExpenses(companyId: string): Promise<number> {
  const expenseLedgers = await prisma.accountLedger.findMany({
    where: { companyId, type: AccountType.EXPENSE },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return expenseLedgers.reduce((sum, ledger) => {
    return sum + calculateLedgerBalance(ledger);
  }, 0);
}

export async function getNetProfit(companyId: string): Promise<number> {
  const revenue = await getTotalRevenue(companyId);
  const expenses = await getTotalExpenses(companyId);
  return revenue - expenses;
}

export async function getReceivables(companyId: string): Promise<number> {
  const arLedger = await prisma.accountLedger.findFirst({
    where: { companyId, name: "Accounts Receivable" },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  return arLedger ? calculateLedgerBalance(arLedger) : 0;
}

export async function getMonthlyRevenueTrend(
  companyId: string,
  months = 6
) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const transactions = await prisma.accountTransaction.findMany({
    where: {
      companyId,
      account: {
        type: AccountType.INCOME,
      },
      transactionType: "CREDIT",
      date: {
        gte: startDate,
      },
    },
    select: {
      date: true,
      amount: true,
    },
  });

  const monthlyMap = new Map<string, number>();
  transactions.forEach((tx) => {
    const month = tx.date.toISOString().slice(0, 7);
    const current = monthlyMap.get(month) || 0;
    monthlyMap.set(month, current + tx.amount);
  });

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));
}

export async function getTopExpenses(
  companyId: string,
  limit = 5
) {
  const expenseTransactions = await prisma.accountTransaction.findMany({
    where: {
      companyId,
      account: {
        type: AccountType.EXPENSE,
      },
      transactionType: "DEBIT",
    },
    include: {
      account: true,
    },
    orderBy: {
      amount: "desc",
    },
    take: limit * 3,
  });

  // Group by description/reference
  const grouped = new Map<string, { total: number; count: number; account: string }>();
  expenseTransactions.forEach((tx) => {
    const key = tx.description || tx.reference || "Unknown";
    const current = grouped.get(key) || { total: 0, count: 0, account: tx.account.name };
    current.total += tx.amount;
    current.count++;
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([description, data]) => ({
      description,
      total: data.total,
      count: data.count,
      account: data.account,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export async function getProfitLossWithBreakdown(
  companyId: string,
  options?: { startDate?: string; endDate?: string }
) {
  const { startDate, endDate } = options || {};

  const where = {
    companyId,
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const transactions = await prisma.accountTransaction.findMany({
    where,
    include: {
      account: true,
    },
  });

  // Revenue breakdown by source
  const revenueTransactions = transactions.filter(
    (t) => t.account.type === AccountType.INCOME && t.transactionType === "CREDIT"
  );

  const revenueBySource = new Map<string, number>();
  revenueTransactions.forEach((tx) => {
    const source = tx.referenceType || tx.description || "Direct Revenue";
    const current = revenueBySource.get(source) || 0;
    revenueBySource.set(source, current + tx.amount);
  });

  // Expense breakdown by category
  const expenseTransactions = transactions.filter(
    (t) => t.account.type === AccountType.EXPENSE && t.transactionType === "DEBIT"
  );

  const expensesByCategory = new Map<string, number>();
  expenseTransactions.forEach((tx) => {
    const category = tx.referenceType || tx.account.name || "Other Expense";
    const current = expensesByCategory.get(category) || 0;
    expensesByCategory.set(category, current + tx.amount);
  });

  const revenue = revenueTransactions.reduce((sum, t) => sum + t.amount, 0);
  const expenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    period: {
      start: startDate,
      end: endDate,
    },
    breakdown: {
      revenueBySource: Array.from(revenueBySource.entries()).map(([source, amount]) => ({
        source,
        amount,
      })),
      expensesByCategory: Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
      })),
    },
  };
}

export async function getCashFlowWithBreakdown(
  companyId: string,
  options?: { startDate?: string; endDate?: string }
) {
  const { startDate, endDate } = options || {};

  const where = {
    companyId,
    account: {
      OR: [{ name: "Cash" }, { name: "Bank" }],
    },
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const transactions = await prisma.accountTransaction.findMany({
    where,
    include: {
      account: true,
    },
  });

  const cashInflows = transactions
    .filter((t) => t.transactionType === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const cashOutflows = transactions
    .filter((t) => t.transactionType === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = cashInflows - cashOutflows;

  // Opening balance calculation
  const openingWhere = {
    companyId,
    account: {
      OR: [{ name: "Cash" }, { name: "Bank" }],
    },
    ...(startDate && {
      date: {
        lt: new Date(startDate),
      },
    }),
  };

  const openingTransactions = await prisma.accountTransaction.findMany({
    where: openingWhere,
    include: {
      account: true,
    },
  });

  const openingDebits = openingTransactions
    .filter((t) => t.transactionType === "DEBIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const openingCredits = openingTransactions
    .filter((t) => t.transactionType === "CREDIT")
    .reduce((sum, t) => sum + t.amount, 0);

  const openingBalance = openingDebits - openingCredits;
  const closingBalance = openingBalance + netCashFlow;

  return {
    openingBalance,
    cashInflows,
    cashOutflows,
    closingBalance,
    netCashFlow,
    period: {
      start: startDate,
      end: endDate,
    },
  };
}

export async function getBalanceSheetWithBreakdown(companyId: string) {
  const ledgers = await prisma.accountLedger.findMany({
    where: { companyId },
    include: {
      transactions: {
        select: {
          amount: true,
          transactionType: true,
        },
      },
    },
  });

  const cashLedger = ledgers.find((l) => l.name === "Cash");
  const bankLedger = ledgers.find((l) => l.name === "Bank");
  const arLedger = ledgers.find((l) => l.name === "Accounts Receivable");

  const cash = cashLedger ? calculateLedgerBalance(cashLedger) : 0;
  const bank = bankLedger ? calculateLedgerBalance(bankLedger) : 0;
  const accountsReceivable = arLedger ? calculateLedgerBalance(arLedger) : 0;

  const totalAssets = cash + bank + accountsReceivable;

  const revenueLedgers = ledgers.filter((l) => l.type === AccountType.INCOME);
  const expenseLedgers = ledgers.filter((l) => l.type === AccountType.EXPENSE);

  const revenue = revenueLedgers.reduce(
    (sum, ledger) => sum + calculateLedgerBalance(ledger),
    0
  );

  const expenses = expenseLedgers.reduce(
    (sum, ledger) => sum + calculateLedgerBalance(ledger),
    0
  );

  const netProfit = revenue - expenses;

  // Assets = Liabilities + Equity
  // For simplicity, we'll treat netProfit as equity (retained earnings)
  const equity = netProfit;
  const liabilities = 0; // Can be extended if liability accounts are added

  return {
    assets: {
      cash,
      bank,
      accountsReceivable,
      total: totalAssets,
    },
    liabilities: {
      total: liabilities,
    },
    equity: {
      netProfit,
      total: equity,
    },
    balancingCheck: {
      assets: totalAssets,
      liabilitiesPlusEquity: liabilities + equity,
      isBalanced: Math.abs(totalAssets - (liabilities + equity)) < 0.01,
    },
  };
}
