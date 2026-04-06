import { getSaaSBalanceSheet } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSBalanceSheetPage() {
  const report = await getSaaSBalanceSheet();

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
            Platform Balance Sheet
          </h2>
          <p className="text-sm text-gray-500">
            Consolidated assets, liabilities, and equity
          </p>
        </div>
      </div>

      {/* Balancing Status */}
      <div
        className={`p-4 rounded-lg border ${
          report.isBalanced
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {report.isBalanced ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                report.isBalanced ? "text-green-900" : "text-red-900"
              }`}
            >
              {report.isBalanced
                ? "Balance Sheet is Balanced"
                : "Balance Sheet is NOT Balanced"}
            </p>
            <p
              className={`text-xs ${
                report.isBalanced ? "text-green-700" : "text-red-700"
              }`}
            >
              Assets (PKR {report.totalAssets.toLocaleString()}) = Liabilities +
              Equity (PKR{" "}
              {(report.totalLiabilities + report.totalEquity).toLocaleString()})
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">Total Assets</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            PKR {report.totalAssets.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50">
          <p className="text-sm font-medium text-orange-700">Total Liabilities</p>
          <p className="text-3xl font-bold mt-2 text-orange-600">
            PKR {report.totalLiabilities.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-purple-200 bg-purple-50">
          <p className="text-sm font-medium text-purple-700">Total Equity</p>
          <p className="text-3xl font-bold mt-2 text-purple-600">
            PKR {report.totalEquity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Assets by Company */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Assets by Company
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
                  Cash
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Bank
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Receivables
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total Assets
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.assetsByCompany.map((company) => (
                <tr key={company.companyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {company.companyName}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    PKR {company.cash.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    PKR {company.bank.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    PKR {company.receivables.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-blue-600">
                    PKR {company.totalAssets.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  PKR{" "}
                  {report.assetsByCompany
                    .reduce((sum, c) => sum + c.cash, 0)
                    .toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  PKR{" "}
                  {report.assetsByCompany
                    .reduce((sum, c) => sum + c.bank, 0)
                    .toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  PKR{" "}
                  {report.assetsByCompany
                    .reduce((sum, c) => sum + c.receivables, 0)
                    .toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600">
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
