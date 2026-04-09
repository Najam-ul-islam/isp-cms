import Link from "next/link";
import { TrendingUp, DollarSign, PieChart, BarChart3, ArrowRight } from "lucide-react";

interface FinancialReportsQuickAccessProps {
  totalRevenue: number;
}

export default function FinancialReportsQuickAccess({
  totalRevenue,
}: FinancialReportsQuickAccessProps) {
  const reports = [
    {
      title: "Profit & Loss",
      description: "Revenue & expenses overview",
      href: "/saas/financial-reports/profit-loss",
      icon: TrendingUp,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-500/10",
      borderColor: "border-blue-200/60 dark:border-blue-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
      hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/5",
    },
    {
      title: "Cash Flow",
      description: "Cash movement tracking",
      href: "/saas/financial-reports/cash-flow",
      icon: DollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
      borderColor: "border-emerald-200/60 dark:border-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
    },
    {
      title: "Balance Sheet",
      description: "Assets & liabilities",
      href: "/saas/financial-reports/balance-sheet",
      icon: PieChart,
      gradient: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50 dark:bg-violet-500/10",
      borderColor: "border-violet-200/60 dark:border-violet-500/20",
      textColor: "text-violet-600 dark:text-violet-400",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
    },
    {
      title: "Revenue by Co.",
      description: "Per-company breakdown",
      href: "/saas/financial-reports/revenue-by-company",
      icon: BarChart3,
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50 dark:bg-amber-500/10",
      borderColor: "border-amber-200/60 dark:border-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                Financial Reports
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Quick access to financial insights
              </p>
            </div>
          </div>
          <Link
            href="/saas/financial-reports"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Report Cards */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;

            return (
              <Link
                key={report.href}
                href={report.href}
                className={`group block p-4 rounded-xl border ${report.borderColor} ${report.hoverBorder} ${report.hoverBg} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${report.bgLight} ${report.textColor} transition-transform duration-200 group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {report.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {report.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
