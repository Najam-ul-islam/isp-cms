"use client";

import { Trophy, BarChart3 } from "lucide-react";

interface TopCompaniesProps {
  companies: {
    id: string;
    name: string;
    revenue: number;
  }[];
}

export default function TopCompanies({ companies }: TopCompaniesProps) {
  if (companies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Top Companies by Revenue
            </h3>
          </div>
        </div>
        <div className="p-6 text-center py-12">
          <BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Top companies will appear here once revenue is generated
          </p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...companies.map((c) => c.revenue));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Top Companies by Revenue
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Highest revenue generating companies
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="space-y-4">
          {companies.map((company, index) => {
            const percentage = maxRevenue > 0 ? (company.revenue / maxRevenue) * 100 : 0;
            const rankColors = [
              { bar: "from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-400", badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" },
              { bar: "from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-400", badge: "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300" },
              { bar: "from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500", badge: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300" },
              { bar: "from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-400", badge: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" },
              { bar: "from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-400", badge: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300" },
            ];
            const colors = rankColors[index] || rankColors[4];

            return (
              <div key={company.id} className="group">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-7 h-7 rounded-full ${colors.badge} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {company.name}
                      </span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-2 flex-shrink-0">
                        PKR {company.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
