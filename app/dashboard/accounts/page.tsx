import { cookies } from "next/headers";
import { getDashboardMetrics, getMonthlyRevenueTrend, getTopExpenses } from "@/lib/accounting/reportService";
import FinancialMetricCard from "@/components/accounts/FinancialMetricCard";
import RevenueTrendChart from "@/components/accounts/RevenueTrendChart";
import TopExpensesList from "@/components/accounts/TopExpensesList";
import Link from "next/link";
import { FileText, TrendingUp, DollarSign, PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsDashboard() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("x-company-id")?.value;

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">No Company Selected</h2>
          <p className="text-sm text-gray-500 mt-2">
            Please select a company first.
          </p>
        </div>
      </div>
    );
  }

  const [metrics, revenueTrend, topExpenses] = await Promise.all([
    getDashboardMetrics(companyId),
    getMonthlyRevenueTrend(companyId, 6),
    getTopExpenses(companyId, 5),
  ]);

  const quickReports = [
    {
      title: "Profit & Loss",
      description: "Revenue, expenses, and net profit",
      href: "/dashboard/accounts/reports/profit-loss",
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Cash Flow",
      description: "Cash inflows and outflows",
      href: "/dashboard/accounts/reports/cash-flow",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Balance Sheet",
      description: "Assets, liabilities, and equity",
      href: "/dashboard/accounts/reports/balance-sheet",
      icon: PieChart,
      color: "purple",
    },
  ];

  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      hover: "hover:border-blue-300 hover:shadow-md",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      hover: "hover:border-green-300 hover:shadow-md",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      hover: "hover:border-purple-300 hover:shadow-md",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Financial overview and performance metrics
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/accounts/transactions"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Transactions
          </Link>
          <Link
            href="/dashboard/accounts/ledgers"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Ledgers
          </Link>
          <Link
            href="/dashboard/accounts/reports"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4 inline mr-2" />
            View Reports
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FinancialMetricCard
          title="Cash Balance"
          value={metrics.cashBalance}
          icon="💵"
          color="green"
          description="Available cash on hand"
        />
        <FinancialMetricCard
          title="Bank Balance"
          value={metrics.bankBalance}
          icon="🏦"
          color="blue"
          description="Bank account balance"
        />
        <FinancialMetricCard
          title="Total Revenue"
          value={metrics.revenue}
          icon="📈"
          color="purple"
          description="Total income earned"
        />
        <FinancialMetricCard
          title="Total Expenses"
          value={metrics.expenses}
          icon="📉"
          color="orange"
          description="Total expenses incurred"
        />
        <FinancialMetricCard
          title="Net Profit"
          value={metrics.profit}
          icon={metrics.profit >= 0 ? "✅" : "⚠️"}
          color={metrics.profit >= 0 ? "green" : "red"}
          description="Revenue minus expenses"
        />
        <FinancialMetricCard
          title="Outstanding Receivables"
          value={metrics.receivables}
          icon="💰"
          color="cyan"
          description="Money owed by clients"
        />
      </div>

      {/* Quick Reports Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickReports.map((report) => {
            const colors = colorMap[report.color as keyof typeof colorMap];
            const Icon = report.icon;

            return (
              <Link
                key={report.href}
                href={report.href}
                className={`block p-6 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg bg-white ${colors.icon}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-900">
                      {report.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {report.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Click to view report →
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendChart data={revenueTrend} />
        <TopExpensesList data={topExpenses} />
      </div>
    </div>
  );
}
