import Link from "next/link";
import { TrendingUp, DollarSign, PieChart } from "lucide-react";

export default function ReportsIndex() {
  const reports = [
    {
      title: "Profit & Loss",
      description: "Revenue, expenses, and net profit breakdown",
      href: "/dashboard/accounts/reports/profit-loss",
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Cash Flow",
      description: "Cash inflows, outflows, and net cash movement",
      href: "/dashboard/accounts/reports/cash-flow",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Balance Sheet",
      description: "Assets, liabilities, and equity overview",
      href: "/dashboard/accounts/reports/balance-sheet",
      icon: PieChart,
      color: "purple",
    },
  ];

  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      hover: "hover:border-blue-300",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      hover: "hover:border-green-300",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      hover: "hover:border-purple-300",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
        <p className="text-sm text-gray-500 mt-1">
          Comprehensive financial analysis and reporting
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((report) => {
          const colors = colorMap[report.color as keyof typeof colorMap];
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className={`block p-6 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-white ${colors.icon}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Click to view report →
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
