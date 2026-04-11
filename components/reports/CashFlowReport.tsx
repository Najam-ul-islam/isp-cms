"use client";

import Link from "next/link";
import { Download, ArrowLeft } from "lucide-react";

interface CashFlowReportProps {
  report: {
    openingBalance: number;
    cashInflows: number;
    cashOutflows: number;
    closingBalance: number;
    netCashFlow: number;
    period: {
      start?: string;
      end?: string;
    };
  };
  dateRange: { from: string; to: string };
}

export default function CashFlowReport({
  report,
  dateRange,
}: CashFlowReportProps) {
  const handleExport = () => {
    const csvContent = [
      "Cash Flow Report",
      `Period: ${dateRange.from} to ${dateRange.to}`,
      "",
      "Item,Amount",
      `Opening Balance,${report.openingBalance}`,
      `Cash Inflows,${report.cashInflows}`,
      `Cash Outflows,${report.cashOutflows}`,
      `Net Cash Flow,${report.netCashFlow}`,
      `Closing Balance,${report.closingBalance}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-flow-${dateRange.from}-${dateRange.to}.csv`;
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
              Cash Flow Report
            </h2>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            {dateRange.from} to {dateRange.to}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-lg border border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Opening Balance</p>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            PKR {report.openingBalance.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Cash Inflows</p>
          <p className="text-2xl font-bold mt-2 text-green-600">
            PKR {report.cashInflows.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Cash Outflows</p>
          <p className="text-2xl font-bold mt-2 text-red-600">
            PKR {report.cashOutflows.toLocaleString()}
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

      {/* Detailed Statement */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Cash Flow Statement
          </h3>
        </div>
        <div className="p-6">
          <table className="w-full">
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="py-4 text-sm font-medium text-gray-900">
                  Opening Balance
                </td>
                <td className="py-4 text-sm text-right font-semibold text-gray-900">
                  PKR {report.openingBalance.toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 text-sm font-medium text-green-700">
                  Add: Cash Inflows
                </td>
                <td className="py-4 text-sm text-right font-semibold text-green-600">
                  + PKR {report.cashInflows.toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 text-sm font-medium text-red-700">
                  Less: Cash Outflows
                </td>
                <td className="py-4 text-sm text-right font-semibold text-red-600">
                  - PKR {report.cashOutflows.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-blue-50 font-semibold">
                <td className="py-4 text-sm text-blue-900">Net Cash Flow</td>
                <td
                  className={`py-4 text-sm text-right ${
                    report.netCashFlow >= 0
                      ? "text-blue-600"
                      : "text-orange-600"
                  }`}
                >
                  PKR {report.netCashFlow.toLocaleString()}
                </td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td className="py-4 text-base text-gray-900">
                  Closing Balance
                </td>
                <td className="py-4 text-base text-right text-gray-900">
                  PKR {report.closingBalance.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            • Cash position{" "}
            {report.netCashFlow >= 0 ? "improved" : "decreased"} by PKR{" "}
            {Math.abs(report.netCashFlow).toLocaleString()} during this period
          </p>
          <p>
            • Cash inflows were{" "}
            {report.cashInflows > report.cashOutflows ? "higher" : "lower"}{" "}
            than outflows
          </p>
          <p>
            • Closing balance stands at PKR{" "}
            {report.closingBalance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
