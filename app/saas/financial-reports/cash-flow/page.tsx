import { getSaaSCashFlow } from "@/lib/saas/financialReportService";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaaSCashFlowPage() {
  const report = await getSaaSCashFlow();

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
            Consolidated Cash Flow
          </h2>
          <p className="text-sm text-gray-500">
            Cash movement across all companies
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Opening Balance</p>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            PKR {report.totalOpeningBalance.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Cash Inflows</p>
          <p className="text-2xl font-bold mt-2 text-green-600">
            PKR {report.totalCashInflows.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Cash Outflows</p>
          <p className="text-2xl font-bold mt-2 text-red-600">
            PKR {report.totalCashOutflows.toLocaleString()}
          </p>
        </div>

        <div
          className={`p-6 rounded-lg border ${
            report.netCashFlow >= 0
              ? "border-blue-200 bg-blue-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              report.netCashFlow >= 0 ? "text-blue-700" : "text-orange-700"
            }`}
          >
            Net Cash Flow
          </p>
          <p
            className={`text-2xl font-bold mt-2 ${
              report.netCashFlow >= 0 ? "text-blue-600" : "text-orange-600"
            }`}
          >
            PKR {report.netCashFlow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Company Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Cash Flow by Company
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
                  Opening
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Inflows
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Outflows
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Net Flow
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Closing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {report.cashFlowByCompany.map((company) => (
                <tr key={company.companyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {company.companyName}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    PKR {company.openingBalance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    PKR {company.inflows.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">
                    PKR {company.outflows.toLocaleString()}
                  </td>
                  <td
                    className={`px-6 py-4 text-sm text-right font-semibold ${
                      company.netFlow >= 0 ? "text-blue-600" : "text-orange-600"
                    }`}
                  >
                    PKR {company.netFlow.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                    PKR {company.closingBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  PKR {report.totalOpeningBalance.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  PKR {report.totalCashInflows.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  PKR {report.totalCashOutflows.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-blue-600">
                  PKR {report.netCashFlow.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-900">
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
