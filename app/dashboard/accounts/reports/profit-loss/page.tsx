import { cookies } from "next/headers";
import { getProfitLossWithBreakdown, getMonthlyRevenueTrend } from "@/lib/accounting/reportService";
import ProfitLossReport from "@/components/reports/ProfitLossReport";

export const dynamic = "force-dynamic";

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("x-company-id")?.value;
  const params = await searchParams;

  // Default to current month
  const now = new Date();
  const from = params.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = params.to || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

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

  const [report, trendData] = await Promise.all([
    getProfitLossWithBreakdown(companyId, { startDate: from, endDate: to }),
    getMonthlyRevenueTrend(companyId, 6),
  ]);

  return (
    <ProfitLossReport
      report={report}
      trendData={trendData}
      dateRange={{ from, to }}
    />
  );
}
