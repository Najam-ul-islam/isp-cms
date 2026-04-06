import { getRevenueReport, getOutstandingReport } from "@/lib/saas/reportService";
import RevenueReport from "@/components/saas/RevenueReport";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [revenueReport, outstandingReport] = await Promise.all([
    getRevenueReport(),
    getOutstandingReport(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-1">
          Revenue and financial insights
        </p>
      </div>

      <RevenueReport
        revenueReport={revenueReport}
        outstandingReport={outstandingReport}
      />
    </div>
  );
}
