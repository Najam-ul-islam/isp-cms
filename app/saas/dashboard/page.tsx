import { getDashboardMetrics } from "@/lib/saas/dashboardService";
import MetricCards from "@/components/saas/MetricCards";
import RecentCompanies from "@/components/saas/RecentCompanies";
import RevenueTrend from "@/components/saas/RevenueTrend";
import TopCompanies from "@/components/saas/TopCompanies";
import FinancialReportsQuickAccess from "@/components/saas/FinancialReportsQuickAccess";
import Link from "next/link";
import { TrendingUp, DollarSign, PieChart, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSDashboard() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Platform-wide metrics</p>
        </div>
        <Link
          href="/saas/financial-reports"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <DollarSign className="w-4 h-4" />
          View Financial Reports
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metric Cards */}
      <MetricCards metrics={metrics} />

      {/* Financial Reports Quick Access */}
      <FinancialReportsQuickAccess totalRevenue={metrics.totalRevenue} />

      {/* Companies and Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentCompanies companies={metrics.recentCompanies} />
        <TopCompanies companies={metrics.topCompanies} />
      </div>

      {/* Revenue Trend */}
      <RevenueTrend data={metrics.monthlyRevenue} />
    </div>
  );
}
