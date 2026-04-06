"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProfitLossChartProps {
  data: { month: string; revenue: number }[];
}

export default function ProfitLossChart({ data }: ProfitLossChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue Trend
        </h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No data available for chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Revenue Trend (Last 6 Months)
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `PKR ${value.toLocaleString()}`}
            />
            <Tooltip
              formatter={(value: any) => [
                `PKR ${Number(value).toLocaleString()}`,
                "Revenue",
              ]}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Bar
              dataKey="revenue"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
