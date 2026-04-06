import { getAdminsByCompanyId } from "@/lib/saas/adminService";
import { getCompanyWithStats } from "@/lib/saas/companyService";
import CompanyAdminsTable from "@/components/saas/CompanyAdminsTable";

export const dynamic = "force-dynamic";

export default async function CompanyAdminsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [company, result] = await Promise.all([
    getCompanyWithStats(id),
    getAdminsByCompanyId(id),
  ]);

  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Company Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">
            The company you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CompanyAdminsTable
      company={company}
      admins={result.admins}
    />
  );
}
