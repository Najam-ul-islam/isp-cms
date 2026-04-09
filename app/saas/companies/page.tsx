import { getCompanies, CompanyWithStats } from "@/lib/saas/companyService";
import CompaniesTable from "@/components/saas/CompaniesTable";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  let companies: CompanyWithStats[] = [];
  let error: string | null = null;

  try {
    companies = await getCompanies();
  } catch (err) {
    console.error("Error fetching companies:", err);
    error = "Failed to load companies. Please try again.";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Companies
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all registered companies ({companies.length} total)
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : (
        <CompaniesTable companies={companies} />
      )}
    </div>
  );
}
