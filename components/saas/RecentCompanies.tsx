"use client";

interface RecentCompaniesProps {
  companies: {
    id: string;
    name: string;
    createdAt: Date;
  }[];
}

export default function RecentCompanies({ companies }: RecentCompaniesProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Companies
      </h3>
      <div className="space-y-3">
        {companies.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No companies yet
          </p>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-sm font-medium text-gray-900">
                {company.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(company.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
