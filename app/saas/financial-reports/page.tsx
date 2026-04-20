import Link from "next/link";
import { TrendingUp, DollarSign, PieChart, BarChart3, ArrowRight, FileText } from "lucide-react";

export default function SaaSFinancialReports() {
  const reports = [
    {
      title: "Platform Profit & Loss",
      description: "Consolidated revenue and expenses across all companies",
      href: "/saas/financial-reports/profit-loss",
      icon: TrendingUp,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50 dark:bg-blue-500/10",
      borderColor: "border-blue-200/60 dark:border-blue-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/40",
      hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/5",
      hoverShadow: "hover:shadow-blue-500/10",
    },
    {
      title: "Consolidated Cash Flow",
      description: "Cash movement and flow across all companies",
      href: "/saas/financial-reports/cash-flow",
      icon: DollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
      borderColor: "border-emerald-200/60 dark:border-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
      hoverBg: "hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5",
      hoverShadow: "hover:shadow-emerald-500/10",
    },
    {
      title: "Platform Balance Sheet",
      description: "Consolidated assets, liabilities, and equity",
      href: "/saas/financial-reports/balance-sheet",
      icon: PieChart,
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50 dark:bg-violet-500/10",
      borderColor: "border-violet-200/60 dark:border-violet-500/20",
      textColor: "text-violet-600 dark:text-violet-400",
      hoverBorder: "hover:border-violet-300 dark:hover:border-violet-500/40",
      hoverBg: "hover:bg-violet-50/80 dark:hover:bg-violet-500/5",
      hoverShadow: "hover:shadow-violet-500/10",
    },
    {
      title: "Revenue by Company",
      description: "Detailed revenue breakdown per company",
      href: "/saas/financial-reports/revenue-by-company",
      icon: BarChart3,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-500/10",
      borderColor: "border-amber-200/60 dark:border-amber-500/20",
      textColor: "text-amber-600 dark:text-amber-400",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/40",
      hoverBg: "hover:bg-amber-50/80 dark:hover:bg-amber-500/5",
      hoverShadow: "hover:shadow-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
          Financial Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Consolidated financial analysis across all companies
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <Link
              key={report.href}
              href={report.href}
              className={`group block p-6 rounded-2xl border ${report.borderColor} bg-white dark:bg-gray-800 ${report.hoverBorder} ${report.hoverBg} transition-all duration-300 hover:shadow-lg ${report.hoverShadow} hover:-translate-y-1`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${report.bgLight} ${report.textColor} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                    View Report
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-200/60 dark:border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Financial Reports Overview
            </h3>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span><strong>Profit & Loss:</strong> See which companies are generating profit</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span><strong>Cash Flow:</strong> Monitor cash movement across all companies</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span><strong>Balance Sheet:</strong> Understand platform-wide financial position</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span><strong>Revenue by Company:</strong> Compare performance across companies</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
