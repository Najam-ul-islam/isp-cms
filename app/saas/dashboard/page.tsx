import { getDashboardMetrics } from "@/lib/saas/dashboardService";
import MetricCards from "@/components/saas/MetricCards";
import RecentCompanies from "@/components/saas/RecentCompanies";
import RevenueTrend from "@/components/saas/RevenueTrend";
import TopCompanies from "@/components/saas/TopCompanies";
import FinancialReportsQuickAccess from "@/components/saas/FinancialReportsQuickAccess";
import Link from "next/link";
import { TrendingUp, DollarSign, ArrowRight, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSDashboard() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor your platform&apos;s performance and key metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/saas/financial-reports"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Reports
          </Link>
          <Link
            href="/saas/financial-reports/profit-loss"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <DollarSign className="w-4 h-4" />
            Financial Reports
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCards metrics={metrics} />

      {/* Financial Reports Quick Access */}
      <FinancialReportsQuickAccess totalRevenue={metrics.totalRevenue} />

      {/* Companies and Revenue */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentCompanies companies={metrics.recentCompanies} />
        <TopCompanies companies={metrics.topCompanies} />
      </div>

      {/* Revenue Trend */}
      <RevenueTrend data={metrics.monthlyRevenue} />
    </div>
  );
}
