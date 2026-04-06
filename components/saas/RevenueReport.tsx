"use client";

import { useState } from "react";

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border border-green-200 bg-green-50">
          <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">
            PKR {revenueReport.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Across all companies
          </p>
        </div>

        <div className="p-6 rounded-lg border border-orange-200 bg-orange-50">
          <h3 className="text-sm font-medium text-gray-600">Outstanding</h3>
          <p className="text-3xl font-bold mt-2 text-orange-600">
            PKR {outstandingReport.totalOutstanding.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Unpaid invoices
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "revenue"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Revenue by Company
            </button>
            <button
              onClick={() => setActiveTab("outstanding")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "outstanding"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Outstanding by Company
            </button>
          </div>
        </div>

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenueReport.companyRevenue.map((company) => (
                  <tr
                    key={company.companyId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {company.companyName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      PKR {company.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {revenueReport.totalRevenue > 0
                        ? (
                            (company.revenue / revenueReport.totalRevenue) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {revenueReport.companyRevenue.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No revenue data available</p>
              </div>
            )}
          </div>
        )}

        {/* Outstanding Tab */}
        {activeTab === "outstanding" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients with Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outstandingReport.companyOutstanding.map((company) => (
                  <tr
                    key={company.companyId}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {company.companyName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {company.clientCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      PKR {company.outstanding.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {outstandingReport.companyOutstanding.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">
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
