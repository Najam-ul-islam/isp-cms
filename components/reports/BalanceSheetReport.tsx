"use client";

import Link from "next/link";
import { Download, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

interface BalanceSheetReportProps {
  report: {
    assets: {
      cash: number;
      bank: number;
      accountsReceivable: number;
      total: number;
    };
    liabilities: {
      total: number;
    };
    equity: {
      netProfit: number;
      total: number;
    };
    balancingCheck: {
      assets: number;
      liabilitiesPlusEquity: number;
      isBalanced: boolean;
    };
  };
}

export default function BalanceSheetReport({
  report,
}: BalanceSheetReportProps) {
  const handleExport = () => {
    const csvContent = [
      "Balance Sheet Report",
      "",
      "Assets",
      `Cash,${report.assets.cash}`,
      `Bank,${report.assets.bank}`,
      `Accounts Receivable,${report.assets.accountsReceivable}`,
      `Total Assets,${report.assets.total}`,
      "",
      "Liabilities",
      `Total Liabilities,${report.liabilities.total}`,
      "",
      "Equity",
      `Net Profit,${report.equity.netProfit}`,
      `Total Equity,${report.equity.total}`,
      "",
      "Balancing Check",
      `Assets,${report.balancingCheck.assets}`,
      `Liabilities + Equity,${report.balancingCheck.liabilitiesPlusEquity}`,
      `Balanced,${report.balancingCheck.isBalanced ? "Yes" : "No"}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/accounts/reports"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">
              Balance Sheet
            </h2>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            Financial position overview
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Balancing Status */}
      <div
        className={`p-4 rounded-lg border ${
          report.balancingCheck.isBalanced
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {report.balancingCheck.isBalanced ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <p
              className={`text-sm font-semibold ${
                report.balancingCheck.isBalanced
                  ? "text-green-900"
                  : "text-red-900"
              }`}
            >
              {report.balancingCheck.isBalanced
                ? "Balance Sheet is Balanced"
                : "Balance Sheet is NOT Balanced"}
            </p>
            <p
              className={`text-xs ${
                report.balancingCheck.isBalanced
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              Assets (PKR {report.balancingCheck.assets.toLocaleString()}) =
              Liabilities + Equity (PKR{" "}
              {report.balancingCheck.liabilitiesPlusEquity.toLocaleString()})
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">Total Assets</p>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            PKR {report.assets.total.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50">
          <p className="text-sm font-medium text-orange-700">
            Total Liabilities
          </p>
          <p className="text-3xl font-bold mt-2 text-orange-600">
            PKR {report.liabilities.total.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-purple-200 bg-purple-50">
          <p className="text-sm font-medium text-purple-700">Total Equity</p>
          <p className="text-3xl font-bold mt-2 text-purple-600">
            PKR {report.equity.total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Detailed Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-900">Assets</h3>
          </div>
          <div className="p-6">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-700">Cash</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">
                    PKR {report.assets.cash.toLocaleString()}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-700">Bank</td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">
                    PKR {report.assets.bank.toLocaleString()}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 text-sm text-gray-700">
                    Accounts Receivable
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">
                    PKR {report.assets.accountsReceivable.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-blue-50 font-bold">
                  <td className="py-4 text-sm text-blue-900">Total Assets</td>
                  <td className="py-4 text-sm text-right text-blue-900">
                    PKR {report.assets.total.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-purple-50">
            <h3 className="text-lg font-semibold text-purple-900">
              Liabilities & Equity
            </h3>
          </div>
          <div className="p-6">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 text-sm font-medium text-gray-700">
                    Liabilities
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">
                    PKR {report.liabilities.total.toLocaleString()}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 text-sm font-medium text-gray-700">
                    Net Profit (Retained Earnings)
                  </td>
                  <td className="py-3 text-sm text-right font-medium text-gray-900">
                    PKR {report.equity.netProfit.toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-purple-50 font-bold">
                  <td className="py-4 text-sm text-purple-900">
                    Total Liabilities + Equity
                  </td>
                  <td className="py-4 text-sm text-right text-purple-900">
                    PKR {report.balancingCheck.liabilitiesPlusEquity.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Accounting Equation
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-lg font-mono font-bold text-gray-900">
            Assets = Liabilities + Equity
          </p>
          <p className="text-sm text-gray-600 mt-2">
            PKR {report.balancingCheck.assets.toLocaleString()} = PKR{" "}
            {report.liabilities.total.toLocaleString()} + PKR{" "}
            {report.equity.total.toLocaleString()}
          </p>
          <p className="text-sm text-green-600 font-semibold mt-2">
            {report.balancingCheck.isBalanced ? "✓ Balanced" : "✗ Not Balanced"}
          </p>
        </div>
      </div>
    </div>
  );
}
