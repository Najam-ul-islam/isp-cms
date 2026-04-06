"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

interface TransactionsTableProps {
  transactions: Transaction[];
  page: number;
  totalPages: number;
}

export default function TransactionsTable({
  transactions,
  page,
  totalPages,
}: TransactionsTableProps) {
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    router.push(`/dashboard/accounts/transactions?page=${newPage}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Account Transactions
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Double-entry transaction log
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200">
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
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {tx.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tx.reference ? (
                      <span className="text-xs font-mono">
                        {tx.reference.slice(0, 12)}...
                      </span>
                    ) : (
                      "-"
                    )}
                    {tx.referenceType && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({tx.referenceType})
                      </span>
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
