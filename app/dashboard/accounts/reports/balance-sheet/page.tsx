import { cookies } from "next/headers";
import { getBalanceSheetWithBreakdown } from "@/lib/accounting/reportService";
import BalanceSheetReport from "@/components/reports/BalanceSheetReport";

export const dynamic = "force-dynamic";

export default async function BalanceSheetPage() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("x-company-id")?.value;

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">No Company Selected</h2>
          <p className="text-sm text-gray-500 mt-2">Please select a company first.</p>
        </div>
      </div>
    );
  }

  const report = await getBalanceSheetWithBreakdown(companyId);

  return <BalanceSheetReport report={report} />;
}
