"use client";

import { useState } from "react";
import { DollarSign, AlertCircle, TrendingUp } from "lucide-react";

interface RevenueReport {
  totalRevenue: number;
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
  companyRevenue: {
    companyId: string;
    companyName: string;
    revenue: number;
    clientCount: number;
  }[];
}

interface OutstandingReport {
  totalOutstanding: number;
  companyOutstanding: {
    companyId: string;
    companyName: string;
    outstanding: number;
    clientCount: number;
  }[];
}

interface RevenueReportProps {
  revenueReport: RevenueReport;
  outstandingReport: OutstandingReport;
}

export default function RevenueReport({
  revenueReport,
  outstandingReport,
}: RevenueReportProps) {
  const [activeTab, setActiveTab] = useState<"revenue" | "outstanding">(
    "revenue"
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent">
            PKR {revenueReport.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Across all companies
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200/60 dark:border-amber-500/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Outstanding</p>
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300 bg-clip-text text-transparent">
            PKR {outstandingReport.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Unpaid invoices
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex gap-1 px-6 pt-4" role="tablist">
            <button
              onClick={() => setActiveTab("revenue")}
              role="tab"
              aria-selected={activeTab === "revenue"}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === "revenue"
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              Revenue by Company
            </button>
            <button
              onClick={() => setActiveTab("outstanding")}
              role="tab"
              aria-selected={activeTab === "outstanding"}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                activeTab === "outstanding"
                  ? "border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              Outstanding by Company
            </button>
          </div>
        </div>

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Company
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Clients
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Revenue
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {revenueReport.companyRevenue.map((company) => (
                  <tr
                    key={company.companyId}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150"
                  >
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
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      PKR {company.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        {revenueReport.totalRevenue > 0
                          ? (
                              (company.revenue / revenueReport.totalRevenue) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {revenueReport.companyRevenue.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No revenue data available</p>
              </div>
            )}
          </div>
        )}

        {/* Outstanding Tab */}
        {activeTab === "outstanding" && (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Company
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Clients with Outstanding
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                    Outstanding Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {outstandingReport.companyOutstanding.map((company) => (
                  <tr
                    key={company.companyId}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {company.companyName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {company.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-amber-600 dark:text-amber-400">
                      PKR {company.outstanding.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {outstandingReport.companyOutstanding.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No outstanding data available
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
