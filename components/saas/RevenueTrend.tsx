"use client";

import { TrendingUp, BarChart3 } from "lucide-react";

interface RevenueTrendProps {
  data: {
    month: string;
    revenue: number;
  }[];
}

export default function RevenueTrend({ data }: RevenueTrendProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Monthly Revenue Trend
            </h3>
          </div>
        </div>
        <div className="p-6 text-center py-12">
          <BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No revenue data available</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Revenue trends will appear as transactions occur
          </p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = totalRevenue / data.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Monthly Revenue Trend
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Average: PKR {avgRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="p-6">
        <div className="space-y-4">
          {data.map((item) => {
            const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
            const isAboveAvg = item.revenue >= avgRevenue;

            return (
              <div key={item.month} className="group">
                <div className="flex items-center gap-4 mb-1.5">
                  <div className="w-16 text-sm font-medium text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {item.month}
                  </div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-3 ${
                        isAboveAvg
                          ? "bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400"
                          : "bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-400"
                      }`}
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    >
                      {percentage > 20 && (
                        <span className="text-xs font-semibold text-white drop-shadow-sm">
                          PKR {item.revenue.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {percentage <= 20 && (
                    <div className="w-24 text-sm text-gray-600 dark:text-gray-300 flex-shrink-0">
                      PKR {item.revenue.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
