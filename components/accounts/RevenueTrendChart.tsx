interface RevenueTrendChartProps {
  data: {
    month: string;
    revenue: number;
  }[];
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Monthly Revenue Trend
        </h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No revenue data available</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Monthly Revenue Trend
      </h3>
      <div className="space-y-3">
        {data.map((item) => {
          const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={item.month} className="flex items-center gap-4">
              <div className="w-20 text-sm text-gray-600 font-medium">
                {item.month}
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                >
                  {percentage > 20 && (
                    <span className="text-xs font-medium text-white">
                      PKR {item.revenue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {percentage <= 20 && (
                <div className="w-28 text-sm text-gray-600">
                  PKR {item.revenue.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
