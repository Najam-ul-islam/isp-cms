import Link from "next/link";
import { TrendingUp, DollarSign, PieChart, BarChart3, ArrowRight } from "lucide-react";

export default function SaaSFinancialReports() {
  const reports = [
    {
      title: "Platform Profit & Loss",
      description: "Consolidated revenue and expenses across all companies",
      href: "/saas/financial-reports/profit-loss",
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Consolidated Cash Flow",
      description: "Cash movement and flow across all companies",
      href: "/saas/financial-reports/cash-flow",
      icon: DollarSign,
      color: "green",
    },
    {
      title: "Platform Balance Sheet",
      description: "Consolidated assets, liabilities, and equity",
      href: "/saas/financial-reports/balance-sheet",
      icon: PieChart,
      color: "purple",
    },
    {
      title: "Revenue by Company",
      description: "Detailed revenue breakdown per company",
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
        <p className="text-sm text-gray-500 mt-1">
          Consolidated financial analysis across all companies
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const colors = colorMap[report.color as keyof typeof colorMap];
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className={`block p-6 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-all`}
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
                  <div className="flex items-center gap-2 mt-3 text-sm font-medium text-blue-600">
                    View Report <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          💡 Financial Reports Overview
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• <strong>Profit & Loss:</strong> See which companies are generating profit</li>
          <li>• <strong>Cash Flow:</strong> Monitor cash movement across all companies</li>
          <li>• <strong>Balance Sheet:</strong> Understand platform-wide financial position</li>
          <li>• <strong>Revenue by Company:</strong> Compare performance across companies</li>
        </ul>
      </div>
    </div>
  );
}
