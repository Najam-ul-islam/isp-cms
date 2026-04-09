import { getAuditLogs, getAuditActions } from "@/lib/saas/auditService";
import { getCompanies } from "@/lib/saas/companyService";
import AuditLogsTable from "@/components/saas/AuditLogsTable";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    companyId?: string;
    userId?: string;
    action?: string;
  }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const companyId = params.companyId;
  const userId = params.userId;
  const action = params.action;

  const [logsResult, actions, companies] = await Promise.all([
    getAuditLogs({ page, limit: 50, companyId, userId, action }),
    getAuditActions(),
    getCompanies(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Audit Logs
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor system activity and changes
        </p>
      </div>

      <AuditLogsTable
        logs={logsResult.logs}
        actions={actions}
        companies={companies}
        totalPages={logsResult.totalPages}
        currentPage={page}
      />
    </div>
  );
}
