import { getCompanyWithStats } from "@/lib/saas/companyService";
import CompanyDetail from "@/components/saas/CompanyDetail";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompanyWithStats(id);

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

  return <CompanyDetail company={company} />;
}
