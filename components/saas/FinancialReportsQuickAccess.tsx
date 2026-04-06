import Link from "next/link";
import { TrendingUp, DollarSign, PieChart, BarChart3 } from "lucide-react";

interface FinancialReportsQuickAccessProps {
  totalRevenue: number;
}

export default function FinancialReportsQuickAccess({
  totalRevenue,
}: FinancialReportsQuickAccessProps) {
  const reports = [
    {
      title: "Platform Profit & Loss",
      description: "Revenue & expenses across all companies",
      href: "/saas/financial-reports/profit-loss",
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Consolidated Cash Flow",
      description: "Cash movement across all companies",
      href: "/saas/financial-reports/cash-flow",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Platform Balance Sheet",
      description: "Assets & liabilities overview",
      href: "/saas/financial-reports/balance-sheet",
      icon: PieChart,
      color: "purple",
    },
    {
      title: "Revenue by Company",
      description: "Breakdown by company",
      href: "/saas/financial-reports/revenue-by-company",
      icon: BarChart3,
      color: "orange",
    },
  ];

  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "text-blue-600",
      hover: "hover:border-blue-300 hover:shadow-md",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "text-green-600",
      hover: "hover:border-green-300 hover:shadow-md",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "text-purple-600",
      hover: "hover:border-purple-300 hover:shadow-md",
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "text-orange-600",
      hover: "hover:border-orange-300 hover:shadow-md",
    },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Financial Reports
        </h3>
        <Link
          href="/saas/financial-reports"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All Reports →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => {
          const colors = colorMap[report.color as keyof typeof colorMap];
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className={`block p-5 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-white ${colors.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {report.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {report.description}
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
