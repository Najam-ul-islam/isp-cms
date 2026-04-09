import { getSaaSCashFlow } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSCashFlowPage() {
  const report = await getSaaSCashFlow();

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
            Consolidated Cash Flow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cash movement across all companies
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Opening Balance</p>
          <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-gray-50">
            PKR {report.totalOpeningBalance.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Inflows</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
            PKR {report.totalCashInflows.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200/60 dark:border-red-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
              <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Outflows</p>
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 dark:from-red-400 dark:to-red-300 bg-clip-text text-transparent">
            PKR {report.totalCashOutflows.toLocaleString()}
          </p>
        </div>

        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl border p-6 ${
            report.netCashFlow >= 0
              ? "border-blue-200/60 dark:border-blue-500/20"
              : "border-amber-200/60 dark:border-amber-500/20"
          }`}
        >
          <p className={`text-sm font-medium ${
            report.netCashFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            Net Cash Flow
          </p>
          <p className={`text-2xl font-bold mt-2 ${
            report.netCashFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
          }`}>
            PKR {report.netCashFlow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Cash Flow by Company
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
                  Opening
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Inflows
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Outflows
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Net Flow
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Closing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {report.cashFlowByCompany.map((company) => (
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
                    PKR {company.openingBalance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">
                    PKR {company.inflows.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-red-600 dark:text-red-400">
                    PKR {company.outflows.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-sm text-right font-semibold ${
                    company.netFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    PKR {company.netFlow.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                    PKR {company.closingBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/80 dark:bg-gray-700/30 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                  PKR {report.totalOpeningBalance.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400">
                  PKR {report.totalCashInflows.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400">
                  PKR {report.totalCashOutflows.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600 dark:text-blue-400">
                  PKR {report.netCashFlow.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-gray-100">
                  PKR {report.totalClosingBalance.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
