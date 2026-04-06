"use client";

import Link from "next/link";
import { Download, ArrowLeft } from "lucide-react";
import ProfitLossChart from "./ProfitLossChart";

interface ProfitLossReportProps {
  report: {
    revenue: number;
    expenses: number;
    netProfit: number;
    period: {
      start?: string;
      end?: string;
    };
    breakdown: {
      revenueBySource: { source: string; amount: number }[];
      expensesByCategory: { category: string; amount: number }[];
    };
  };
  trendData: { month: string; revenue: number }[];
  dateRange: { from: string; to: string };
}

export default function ProfitLossReport({
  report,
  trendData,
  dateRange,
}: ProfitLossReportProps) {
  const handleExport = () => {
    const csvContent = [
      "Profit & Loss Report",
      `Period: ${dateRange.from} to ${dateRange.to}`,
      "",
      "Revenue",
      report.breakdown.revenueBySource
        .map((r) => `${r.source},${r.amount}`)
        .join("\n"),
      "",
      `Total Revenue,${report.revenue}`,
      "",
      "Expenses",
      report.breakdown.expensesByCategory
        .map((e) => `${e.category},${e.amount}`)
        .join("\n"),
      "",
      `Total Expenses,${report.expenses}`,
      "",
      `Net Profit,${report.netProfit}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${dateRange.from}-${dateRange.to}.csv`;
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
              Profit & Loss Report
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-700">Total Revenue</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            PKR {report.revenue.toLocaleString()}
          </p>
        </div>

        <div className="p-6 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">Total Expenses</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            PKR {report.expenses.toLocaleString()}
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

      {/* Chart */}
      <ProfitLossChart data={trendData} />

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue by Source
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.breakdown.revenueBySource.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.source}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                      PKR {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                  <td className="px-6 py-4 text-sm text-right text-green-600">
                    PKR {report.revenue.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Expenses by Category
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.breakdown.expensesByCategory.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-red-600">
                      PKR {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">
                    PKR {report.expenses.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
