"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Activity, X } from "lucide-react";

interface AuditLog {
  id: string;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  companyName: string;
  createdAt: Date;
}

interface Company {
  id: string;
  name: string;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
  actions: string[];
  companies: Company[];
  totalPages: number;
  currentPage: number;
}

export default function AuditLogsTable({
  logs,
  actions,
  companies,
  totalPages,
  currentPage,
}: AuditLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const currentCompanyId = searchParams.get("companyId") || "";
  const currentAction = searchParams.get("action") || "";

  const hasActiveFilters = currentCompanyId || currentAction;

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/saas/audit-logs?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/saas/audit-logs?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/saas/audit-logs");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Activity Log
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {logs.length} log{logs.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 ${
              showFilters || hasActiveFilters
                ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                {[currentCompanyId, currentAction].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Filter Logs</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Company
                </label>
                <select
                  value={currentCompanyId}
                  onChange={(e) => handleFilterChange("companyId", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Action
                </label>
                <select
                  value={currentAction}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-gray-100 transition-all"
                >
                  <option value="">All Actions</option>
                  {actions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                User
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Action
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Entity
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Company
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider" scope="col">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors duration-150"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 dark:from-slate-400 dark:to-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(log.userName || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.userName || 'System'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {log.entity}
                  {log.entityId && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                      ({log.entityId.slice(0, 8)})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {log.companyName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? "No logs match your filters" : "No audit logs found"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
