"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Filter, Download } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  reference: string | null;
  referenceType: string | null;
  transactionType: string;
  date: Date;
  account: {
    name: string;
    type: string;
  };
}

interface Ledger {
  id: string;
  name: string;
  type: string;
}

interface TransactionsViewProps {
  transactions: Transaction[];
  ledgers: Ledger[];
  page: number;
  totalPages: number;
  total: number;
  filters: {
    startDate?: string;
    endDate?: string;
    ledgerId?: string;
    transactionType?: string;
    referenceType?: string;
  };
}

export default function TransactionsView({
  transactions,
  ledgers,
  page,
  totalPages,
  total,
  filters,
}: TransactionsViewProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filterData, setFilterData] = useState(filters);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterData, [key]: value };
    setFilterData(newFilters);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    
    if (filterData.startDate) params.set("startDate", filterData.startDate);
    if (filterData.endDate) params.set("endDate", filterData.endDate);
    if (filterData.ledgerId) params.set("ledgerId", filterData.ledgerId);
    if (filterData.transactionType) params.set("transactionType", filterData.transactionType);
    if (filterData.referenceType) params.set("referenceType", filterData.referenceType);

    router.push(`/dashboard/accounts/transactions?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilterData({});
    router.push("/dashboard/accounts/transactions");
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", newPage.toString());
    
    if (filterData.startDate) params.set("startDate", filterData.startDate);
    if (filterData.endDate) params.set("endDate", filterData.endDate);
    if (filterData.ledgerId) params.set("ledgerId", filterData.ledgerId);
    if (filterData.transactionType) params.set("transactionType", filterData.transactionType);
    if (filterData.referenceType) params.set("referenceType", filterData.referenceType);

    router.push(`/dashboard/accounts/transactions?${params.toString()}`);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Account", "Type", "Amount", "Description", "Reference"];
    const rows = transactions.map((tx) => [
      new Date(tx.date).toLocaleDateString(),
      tx.account.name,
      tx.transactionType,
      tx.amount.toString(),
      tx.description,
      tx.reference || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Account Transactions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {total} transaction(s) found
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <Link
            href="/dashboard/accounts"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          {(filterData.startDate || filterData.endDate || filterData.ledgerId || filterData.transactionType) && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filterData.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filterData.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ledger
              </label>
              <select
                value={filterData.ledgerId || ""}
                onChange={(e) => handleFilterChange("ledgerId", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Ledgers</option>
                {ledgers.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledger.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filterData.transactionType || ""}
                onChange={(e) => handleFilterChange("transactionType", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="DEBIT">DEBIT</option>
                <option value="CREDIT">CREDIT</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {tx.account.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.transactionType === "DEBIT"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {tx.transactionType}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 text-sm font-medium ${
                      tx.transactionType === "DEBIT"
                        ? "text-blue-600"
                        : "text-green-600"
                    }`}
                  >
                    PKR {tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tx.reference ? (
                      <div>
                        <span className="text-xs font-mono">
                          {tx.reference.slice(0, 12)}...
                        </span>
                        {tx.referenceType && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({tx.referenceType})
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No transactions found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
