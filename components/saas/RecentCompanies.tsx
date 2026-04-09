"use client";

import { Building2, Calendar } from "lucide-react";

interface RecentCompaniesProps {
  companies: {
    id: string;
    name: string;
    createdAt: Date;
  }[];
}

export default function RecentCompanies({ companies }: RecentCompaniesProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              Recent Companies
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Newly registered companies
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {companies.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No companies yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Companies will appear here once registered
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company, index) => (
              <div
                key={company.id}
                className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {company.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(company.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
