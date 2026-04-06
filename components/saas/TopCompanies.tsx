"use client";

interface TopCompaniesProps {
  companies: {
    id: string;
    name: string;
    revenue: number;
  }[];
}

export default function TopCompanies({ companies }: TopCompaniesProps) {
  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Companies by Revenue
        </h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...companies.map((c) => c.revenue));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Companies by Revenue
      </h3>
      <div className="space-y-3">
        {companies.map((company, index) => {
          const percentage = maxRevenue > 0 ? (company.revenue / maxRevenue) * 100 : 0;
          const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
          return (
            <div key={company.id} className="flex items-center gap-4">
              <div className="text-2xl">{medals[index]}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {company.name}
                  </span>
                  <span className="text-xs text-gray-600 font-medium">
                    PKR {company.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
