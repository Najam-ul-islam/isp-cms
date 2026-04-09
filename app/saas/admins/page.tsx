import { getAdmins } from "@/lib/saas/adminService";
import AdminsTable from "@/components/saas/AdminsTable";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  let result: { admins: any[]; total: number } = { admins: [], total: 0 };
  let error: string | null = null;

  try {
    result = await getAdmins({ page: 1, limit: 50 });
  } catch (err) {
    console.error("Error fetching admins:", err);
    error = "Failed to load admins. Please try again.";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Admins
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage platform administrators ({result.total} total)
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : (
        <AdminsTable admins={result.admins} />
      )}
    </div>
  );
}
