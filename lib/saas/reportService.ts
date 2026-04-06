import { prisma } from "@/lib/prisma";

export interface RevenueReport {
  totalRevenue: number;
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
  companyRevenue: {
    companyId: string;
    companyName: string;
    revenue: number;
    clientCount: number;
  }[];
}

export interface OutstandingReport {
  totalOutstanding: number;
  companyOutstanding: {
    companyId: string;
    companyName: string;
    outstanding: number;
    clientCount: number;
  }[];
}

export async function getRevenueReport(): Promise<RevenueReport> {
  // Total revenue
  const totalRevenueResult = await prisma.payment.aggregate({
    _sum: { amount: true },
  });

  // Monthly revenue (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyPayments = await prisma.payment.groupBy({
    by: ["paymentDate"],
    where: {
      paymentDate: {
        gte: sixMonthsAgo,
      },
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      paymentDate: "asc",
    },
  });

  // Group by month
  const monthlyRevenueMap = new Map<string, number>();
  monthlyPayments.forEach((payment) => {
    const month = payment.paymentDate.toISOString().slice(0, 7); // YYYY-MM
    const current = monthlyRevenueMap.get(month) || 0;
    monthlyRevenueMap.set(month, current + (payment._sum.amount || 0));
  });

  const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      month,
      revenue,
    }));

  // Company-wise revenue
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: { clients: true },
      },
    },
  });

  const companyRevenue = await Promise.all(
    companies.map(async (company) => {
      const revenue = await prisma.payment.aggregate({
        where: { companyId: company.id },
        _sum: { amount: true },
      });

      return {
        companyId: company.id,
        companyName: company.name,
        revenue: revenue._sum.amount || 0,
        clientCount: company._count.clients,
      };
    })
  );

  // Sort by revenue descending
  companyRevenue.sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue: totalRevenueResult._sum.amount || 0,
    monthlyRevenue,
    companyRevenue,
  };
}

export async function getOutstandingReport(): Promise<OutstandingReport> {
  // Get all unpaid/partial invoices
  const outstandingInvoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ["unpaid", "partial"],
      },
    },
    select: {
      companyId: true,
      amount: true,
      clientId: true,
    },
  });

  // Group by company
  const companyMap = new Map<
    string,
    { outstanding: number; clientIds: Set<string> }
  >();

  outstandingInvoices.forEach((invoice) => {
    const current = companyMap.get(invoice.companyId) || {
      outstanding: 0,
      clientIds: new Set<string>(),
    };
    current.outstanding += invoice.amount;
    current.clientIds.add(invoice.clientId);
    companyMap.set(invoice.companyId, current);
  });

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const companyOutstanding = companies.map((company) => {
    const data = companyMap.get(company.id) || {
      outstanding: 0,
      clientIds: new Set<string>(),
    };

    return {
      companyId: company.id,
      companyName: company.name,
      outstanding: data.outstanding,
      clientCount: data.clientIds.size,
    };
  });

  // Sort by outstanding descending
  companyOutstanding.sort((a, b) => b.outstanding - a.outstanding);

  const totalOutstanding = companyOutstanding.reduce(
    (sum, c) => sum + c.outstanding,
    0
  );

  return {
    totalOutstanding,
    companyOutstanding,
  };
}

export async function getTopCompaniesByRevenue(limit = 5) {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
    },
    take: 20, // Get more to sort later
  });

  const companyRevenue = await Promise.all(
    companies.map(async (company) => {
      const revenue = await prisma.payment.aggregate({
        where: { companyId: company.id },
        _sum: { amount: true },
      });

      return {
        id: company.id,
        name: company.name,
        revenue: revenue._sum.amount || 0,
      };
    })
  );

  // Sort by revenue descending and take top N
  return companyRevenue
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getMonthlyRevenueTrend() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: {
        gte: twelveMonthsAgo,
      },
    },
    select: {
      paymentDate: true,
      amount: true,
    },
    orderBy: {
      paymentDate: "asc",
    },
  });

  // Group by month
  const monthlyMap = new Map<string, number>();
  payments.forEach((payment) => {
    const month = payment.paymentDate.toISOString().slice(0, 7);
    const current = monthlyMap.get(month) || 0;
    monthlyMap.set(month, current + payment.amount);
  });

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      month,
      revenue,
    }));
}
