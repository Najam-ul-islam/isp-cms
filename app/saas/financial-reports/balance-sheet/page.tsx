import { getSaaSBalanceSheet } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle, PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSBalanceSheetPage() {
  const report = await getSaaSBalanceSheet();

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
            Platform Balance Sheet
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consolidated assets, liabilities, and equity
          </p>
        </div>
      </div>

      {/* Balancing Status */}
      <div
        className={`p-4 rounded-xl border ${
          report.isBalanced
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20"
            : "bg-red-50 dark:bg-red-500/10 border-red-200/60 dark:border-red-500/20"
        }`}
        role="alert"
      >
        <div className="flex items-center gap-3">
          {report.isBalanced ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <div>
            <p className={`text-sm font-semibold ${
              report.isBalanced ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"
            }`}>
              {report.isBalanced
                ? "Balance Sheet is Balanced"
                : "Balance Sheet is NOT Balanced"}
            </p>
            <p className={`text-xs mt-0.5 ${
              report.isBalanced ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
            }`}>
              Assets (PKR {report.totalAssets.toLocaleString()}) = Liabilities + Equity (PKR{" "}
              {(report.totalLiabilities + report.totalEquity).toLocaleString()})
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200/60 dark:border-blue-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Assets</p>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent">
            PKR {report.totalAssets.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <PieChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Liabilities</p>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
            PKR {report.totalLiabilities.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-violet-200/60 dark:border-violet-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-500/10">
              <PieChart className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Equity</p>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300 bg-clip-text text-transparent">
            PKR {report.totalEquity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Assets by Company */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            Assets by Company
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
                  Cash
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Bank
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Receivables
                </th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                  Total Assets
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {report.assetsByCompany.map((company) => (
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
                    PKR {company.cash.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                    PKR {company.bank.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                    PKR {company.receivables.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                    PKR {company.totalAssets.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50/80 dark:bg-gray-700/30 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                  PKR {report.assetsByCompany.reduce((sum, c) => sum + c.cash, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                  PKR {report.assetsByCompany.reduce((sum, c) => sum + c.bank, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-300">
                  PKR {report.assetsByCompany.reduce((sum, c) => sum + c.receivables, 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600 dark:text-blue-400">
                  PKR {report.totalAssets.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
