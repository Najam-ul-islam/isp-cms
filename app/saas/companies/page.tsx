import { getCompanies } from "@/lib/saas/companyService";
import CompaniesTable from "@/components/saas/CompaniesTable";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage all registered companies
          </p>
        </div>
      </div>

      <CompaniesTable companies={companies} />
    </div>
  );
}
