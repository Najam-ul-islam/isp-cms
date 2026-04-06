import { getAdmins } from "@/lib/saas/adminService";
import AdminsTable from "@/components/saas/AdminsTable";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const result = await getAdmins({ page: 1, limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Admins</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage platform administrators
        </p>
      </div>

      <AdminsTable admins={result.admins} />
    </div>
  );
}
