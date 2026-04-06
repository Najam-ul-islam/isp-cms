import { getSaaSProfitLoss } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSProfitLossPage() {
  const report = await getSaaSProfitLoss();

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
            Platform Profit & Loss
          </h2>
          <p className="text-sm text-gray-500">
            Consolidated across all companies
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Total Revenue</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            PKR {report.totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Total Expenses</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            PKR {report.totalExpenses.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-6 rounded-lg border ${
            report.netProfit >= 0
              ? "border-blue-200 bg-blue-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              report.netProfit >= 0 ? "text-blue-700" : "text-orange-700"
            }`}
          >
            Net Profit
          </p>
          <p
            className={`text-3xl font-bold mt-2 ${
              report.netProfit >= 0 ? "text-blue-600" : "text-orange-600"
            }`}
          >
            PKR {report.netProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Company Breakdown Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown by Company
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
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Expenses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Net Profit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.revenueByCompany.map((company) => (
                <tr key={company.companyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {company.companyName}
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
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  PKR {report.totalRevenue.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  PKR {report.totalExpenses.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600">
                  PKR {report.netProfit.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
