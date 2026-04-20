import { prisma } from "@/lib/prisma";
import { getTopCompaniesByRevenue, getMonthlyRevenueTrend } from "@/lib/saas/reportService";

export interface DashboardMetrics {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalClients: number;
  activeClients: number;
  expiredClients: number;
  totalRevenue: number;
  recentCompanies: {
    id: string;
    name: string;
    createdAt: Date;
  }[];
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
  topCompanies: {
    id: string;
    name: string;
    revenue: number;
  }[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalClients,
      activeClients,
      expiredClients,
      totalRevenueResult,
      recentCompanies,
      monthlyRevenue,
      topCompanies,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.company.count({ where: { isActive: false } }),
      prisma.client.count(),
      prisma.client.count({ where: { status: "active" } }),
      prisma.client.count({ where: { status: "expired" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      getMonthlyRevenueTrend(),
      getTopCompaniesByRevenue(5),
    ]);

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalClients,
      activeClients,
      expiredClients,
      totalRevenue: totalRevenueResult._sum.amount || 0,
      recentCompanies,
      monthlyRevenue,
      topCompanies,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error);
    // Return safe defaults to prevent UI crash
    return {
      totalCompanies: 0,
      activeCompanies: 0,
      suspendedCompanies: 0,
      totalClients: 0,
      activeClients: 0,
      expiredClients: 0,
      totalRevenue: 0,
      recentCompanies: [],
      monthlyRevenue: [],
      topCompanies: [],
    };
  }
}
