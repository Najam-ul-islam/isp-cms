import { getRevenueByCompany } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSRevenueByCompanyPage() {
  const revenueData = await getRevenueByCompany();

  const totalRevenue = revenueData.reduce((sum, c) => sum + c.revenue, 0);
  const totalExpenses = revenueData.reduce((sum, c) => sum + c.expenses, 0);
  const totalProfit = revenueData.reduce((sum, c) => sum + c.profit, 0);
  const totalClients = revenueData.reduce((sum, c) => sum + c.clientCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/saas/financial-reports"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Revenue by Company
          </h2>
          <p className="text-sm text-gray-500">
            Detailed revenue breakdown per company
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Total Revenue</p>
          <p className="text-2xl font-bold mt-2 text-green-600">
            PKR {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Total Expenses</p>
          <p className="text-2xl font-bold mt-2 text-red-600">
            PKR {totalExpenses.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">Total Profit</p>
          <p className="text-2xl font-bold mt-2 text-blue-600">
            PKR {totalProfit.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-purple-200 bg-purple-50">
          <p className="text-sm font-medium text-purple-700">Total Clients</p>
          <p className="text-2xl font-bold mt-2 text-purple-600">
            {totalClients.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Company Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Clients
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Profit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Profit Margin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {revenueData.map((company) => {
                const profitMargin =
                  company.revenue > 0
                    ? ((company.profit / company.revenue) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={company.companyId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {company.companyName}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-green-600">
                      PKR {company.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-red-600">
                      PKR {company.expenses.toLocaleString()}
                    </td>
                    <td
                      className={`px-6 py-4 text-sm text-right font-semibold ${
                        company.profit >= 0 ? "text-blue-600" : "text-orange-600"
                      }`}
                    >
                      PKR {company.profit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          parseFloat(profitMargin) >= 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {profitMargin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  {totalClients.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  PKR {totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  PKR {totalExpenses.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600">
                  PKR {totalProfit.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
