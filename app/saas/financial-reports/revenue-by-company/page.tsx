import { getRevenueByCompany } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSRevenueByCompanyPage() {
  const revenueData = await getRevenueByCompany();

  const totalRevenue = revenueData.reduce((sum, c) => sum + c.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, c) => sum + c.expenses, 0);
  const totalProfit = revenueData.reduce((sum, c) => sum + c.profit, 0);
  const totalClients = revenueData.reduce((sum, c) => sum + c.clientCount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/saas/financial-reports"
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
            Revenue by Company
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed revenue breakdown per company
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
            PKR {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200/60 dark:border-red-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
              <BarChart3 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 dark:from-red-400 dark:to-red-300 bg-clip-text text-transparent">
            PKR {totalExpenses.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200/60 dark:border-blue-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Profit</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            PKR {totalProfit.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-violet-200/60 dark:border-violet-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clients</p>
          </div>
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {totalClients.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Company Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Company
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Clients
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Revenue
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Expenses
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Profit
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Profit Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {revenueData.map((company) => {
                const profitMargin =
                  company.revenue > 0
                    ? ((company.profit / company.revenue) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={company.companyId} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {company.companyName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {company.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">
                      PKR {company.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-red-600 dark:text-red-400">
                      PKR {company.expenses.toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right font-semibold ${
                      company.profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                    }`}>
                      PKR {company.profit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          parseFloat(profitMargin) >= 0
                            ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {profitMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50/80 dark:bg-gray-700/30 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                  {totalClients.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400">
                  PKR {totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400">
                  PKR {totalExpenses.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600 dark:text-blue-400">
                  PKR {totalProfit.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    {totalRevenue > 0
                      ? ((totalProfit / totalRevenue) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
