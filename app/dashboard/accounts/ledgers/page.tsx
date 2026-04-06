import { cookies } from "next/headers";
import { getLedgersByCompanyId } from "@/lib/accounting/ledgerService";
import { calculateLedgerBalance } from "@/lib/accounting/ledgerService";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LedgersPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("x-company-id")?.value;

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">No Company Selected</h2>
          <p className="text-sm text-gray-500 mt-2">
            Please select a company first.
          </p>
        </div>
      </div>
    );
  }

  const ledgers = await getLedgersByCompanyId(companyId, true);

  const typeColorMap: Record<string, string> = {
    ASSET: "bg-blue-100 text-blue-800",
    LIABILITY: "bg-yellow-100 text-yellow-800",
    EQUITY: "bg-purple-100 text-purple-800",
    INCOME: "bg-green-100 text-green-800",
    EXPENSE: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Ledgers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ledger accounts and current balances
          </p>
        </div>
        <Link
          href="/dashboard/accounts"
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Ledgers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ledgers.map((ledger: any) => {
          const balance = calculateLedgerBalance(ledger);
          const typeColor = typeColorMap[ledger.type] || "bg-gray-100 text-gray-800";

          return (
            <div
              key={ledger.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ledger.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${typeColor}`}>
                    {ledger.type}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance</span>
                  <span
                    className={`text-lg font-bold ${
                      balance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    PKR {balance.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transactions</span>
                  <span className="text-sm font-medium text-gray-900">
                    {ledger.transactions?.length || 0}
                  </span>
                </div>

                {ledger.description && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                    {ledger.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ledgers.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">
            No ledgers found. Initialize ledgers first.
          </p>
        </div>
      )}
    </div>
  );
}
