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
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
