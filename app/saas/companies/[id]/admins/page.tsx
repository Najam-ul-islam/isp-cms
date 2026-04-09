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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Company Not Found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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
