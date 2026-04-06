import { cookies } from "next/headers";
import { getAllTransactions } from "@/lib/accounting/accountingService";
import { getLedgersByCompanyId } from "@/lib/accounting/ledgerService";
import TransactionsView from "@/components/accounts/TransactionsView";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    startDate?: string;
    endDate?: string;
    ledgerId?: string;
    transactionType?: string;
    referenceType?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("x-company-id")?.value;
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const startDate = params.startDate;
  const endDate = params.endDate;
  const ledgerId = params.ledgerId;
  const transactionType = params.transactionType;
  const referenceType = params.referenceType;

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

  const [result, ledgers] = await Promise.all([
    getAllTransactions(companyId, {
      page,
      limit: 50,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      ledgerId: ledgerId || undefined,
      transactionType: transactionType || undefined,
      referenceType: referenceType || undefined,
    }),
    getLedgersByCompanyId(companyId, false),
  ]);

  // Type assertion for TypeScript
  const transactions = result.transactions as any;

  return (
    <TransactionsView
      transactions={transactions}
      ledgers={ledgers}
      page={page}
      totalPages={result.totalPages}
      total={result.total}
      filters={{
        startDate,
        endDate,
        ledgerId,
        transactionType,
        referenceType,
      }}
    />
  );
}
