import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

export interface SaaSProfitLoss {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByCompany: {
    companyId: string;
    companyName: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  period?: {
    start?: string;
    end?: string;
  };
}

export interface SaaSCashFlow {
  totalOpeningBalance: number;
  totalCashInflows: number;
  totalCashOutflows: number;
  totalClosingBalance: number;
  netCashFlow: number;
  cashFlowByCompany: {
    companyId: string;
    companyName: string;
    openingBalance: number;
    inflows: number;
    outflows: number;
    closingBalance: number;
    netFlow: number;
  }[];
  period?: {
    start?: string;
    end?: string;
  };
}

export interface SaaSBalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  assetsByCompany: {
    companyId: string;
    companyName: string;
    cash: number;
    bank: number;
    receivables: number;
    totalAssets: number;
  }[];
  isBalanced: boolean;
}

export interface RevenueByCompany {
  companyId: string;
  companyName: string;
  revenue: number;
  expenses: number;
  profit: number;
  clientCount: number;
}

export async function getSaaSProfitLoss(
  options?: { startDate?: string; endDate?: string }
): Promise<SaaSProfitLoss> {
  const { startDate, endDate } = options || {};

  const where = {
    ...(startDate &&
      endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  // Get all companies
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const revenueByCompany: SaaSProfitLoss["revenueByCompany"] = [];
  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const company of companies) {
    const transactions = await prisma.accountTransaction.findMany({
      where: { companyId: company.id, ...where },
      include: { account: true },
    });

    const companyRevenue = transactions
      .filter(
        (t) =>
          t.account.type === AccountType.INCOME && t.transactionType === "CREDIT"
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const companyExpenses = transactions
      .filter(
        (t) =>
          t.account.type === AccountType.EXPENSE && t.transactionType === "DEBIT"
      )
      .reduce((sum, t) => sum + t.amount, 0);

    revenueByCompany.push({
      companyId: company.id,
      companyName: company.name,
      revenue: companyRevenue,
      expenses: companyExpenses,
      profit: companyRevenue - companyExpenses,
    });

    totalRevenue += companyRevenue;
    totalExpenses += companyExpenses;
  }

  // Sort by revenue descending
  revenueByCompany.sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    revenueByCompany,
    period: { start: startDate, end: endDate },
  };
}

export async function getSaaSCashFlow(
  options?: { startDate?: string; endDate?: string }
): Promise<SaaSCashFlow> {
  const { startDate, endDate } = options || {};

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const cashFlowByCompany: SaaSCashFlow["cashFlowByCompany"] = [];
  let totalOpeningBalance = 0;
  let totalCashInflows = 0;
  let totalCashOutflows = 0;
  let totalClosingBalance = 0;

  for (const company of companies) {
    const where = {
      companyId: company.id,
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
      include: { account: true },
    });

    const inflows = transactions
      .filter((t) => t.transactionType === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const outflows = transactions
      .filter((t) => t.transactionType === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const netFlow = inflows - outflows;

    // Opening balance (before start date)
    const openingWhere = {
      companyId: company.id,
      account: {
        OR: [{ name: "Cash" }, { name: "Bank" }],
      },
      ...(startDate && {
        date: { lt: new Date(startDate) },
      }),
    };

    const openingTransactions = await prisma.accountTransaction.findMany({
      where: openingWhere,
    });

    const openingDebits = openingTransactions
      .filter((t) => t.transactionType === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const openingCredits = openingTransactions
      .filter((t) => t.transactionType === "CREDIT")
      .reduce((sum, t) => sum + t.amount, 0);

    const openingBalance = openingDebits - openingCredits;
    const closingBalance = openingBalance + netFlow;

    cashFlowByCompany.push({
      companyId: company.id,
      companyName: company.name,
      openingBalance,
      inflows,
      outflows,
      closingBalance,
      netFlow,
    });

    totalOpeningBalance += openingBalance;
    totalCashInflows += inflows;
    totalCashOutflows += outflows;
    totalClosingBalance += closingBalance;
  }

  // Sort by net flow descending
  cashFlowByCompany.sort((a, b) => b.netFlow - a.netFlow);

  return {
    totalOpeningBalance,
    totalCashInflows,
    totalCashOutflows,
    totalClosingBalance,
    netCashFlow: totalCashInflows - totalCashOutflows,
    cashFlowByCompany,
    period: { start: startDate, end: endDate },
  };
}

export async function getSaaSBalanceSheet(): Promise<SaaSBalanceSheet> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const assetsByCompany: SaaSBalanceSheet["assetsByCompany"] = [];
  let totalAssets = 0;

  for (const company of companies) {
    const ledgers = await prisma.accountLedger.findMany({
      where: { companyId: company.id },
      include: {
        transactions: {
          select: { amount: true, transactionType: true },
        },
      },
    });

    const cashLedger = ledgers.find((l) => l.name === "Cash");
    const bankLedger = ledgers.find((l) => l.name === "Bank");
    const arLedger = ledgers.find((l) => l.name === "Accounts Receivable");

    const calculateBalance = (ledger: any) => {
      if (!ledger) return 0;
      const debits = ledger.transactions
        .filter((t: any) => t.transactionType === "DEBIT")
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      const credits = ledger.transactions
        .filter((t: any) => t.transactionType === "CREDIT")
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      return debits - credits; // ASSET accounts
    };

    const cash = calculateBalance(cashLedger);
    const bank = calculateBalance(bankLedger);
    const receivables = calculateBalance(arLedger);
    const companyTotal = cash + bank + receivables;

    assetsByCompany.push({
      companyId: company.id,
      companyName: company.name,
      cash,
      bank,
      receivables,
      totalAssets: companyTotal,
    });

    totalAssets += companyTotal;
  }

  // Sort by total assets descending
  assetsByCompany.sort((a, b) => b.totalAssets - a.totalAssets);

  // Calculate total equity (net profit across all companies)
  const allTransactions = await prisma.accountTransaction.findMany({
    include: { account: true },
  });

  const totalRevenue = allTransactions
    .filter(
      (t) =>
        t.account.type === AccountType.INCOME && t.transactionType === "CREDIT"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = allTransactions
    .filter(
      (t) =>
        t.account.type === AccountType.EXPENSE && t.transactionType === "DEBIT"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEquity = totalRevenue - totalExpenses;
  const totalLiabilities = 0; // Can be extended later

  return {
    totalAssets,
    totalLiabilities,
    totalEquity,
    assetsByCompany,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

export async function getRevenueByCompany(): Promise<RevenueByCompany[]> {
  const companies = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const revenueByCompany: RevenueByCompany[] = [];

  for (const company of companies) {
    const transactions = await prisma.accountTransaction.findMany({
      where: { companyId: company.id },
      include: { account: true },
    });

    const revenue = transactions
      .filter(
        (t) =>
          t.account.type === AccountType.INCOME && t.transactionType === "CREDIT"
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(
        (t) =>
          t.account.type === AccountType.EXPENSE && t.transactionType === "DEBIT"
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const clientCount = await prisma.client.count({
      where: { companyId: company.id },
    });

    revenueByCompany.push({
      companyId: company.id,
      companyName: company.name,
      revenue,
      expenses,
      profit: revenue - expenses,
      clientCount,
    });
  }

  // Sort by revenue descending
  return revenueByCompany.sort((a, b) => b.revenue - a.revenue);
}
