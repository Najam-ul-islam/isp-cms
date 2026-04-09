"use client";

import { Building2, Users, DollarSign, ArrowUpRight } from "lucide-react";

interface MetricCardsProps {
  metrics: {
    totalCompanies: number;
    activeCompanies: number;
    totalClients: number;
    activeClients: number;
    expiredClients: number;
    totalRevenue: number;
  };
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: "Total Companies",
      value: metrics.totalCompanies.toLocaleString(),
      subtitle: `${metrics.activeCompanies} active`,
      icon: Building2,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-500/10",
      textColor: "text-blue-600 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total Clients",
      value: metrics.totalClients.toLocaleString(),
      subtitle: `${metrics.activeClients} active, ${metrics.expiredClients} expired`,
      icon: Users,
      gradient: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-500/10",
      textColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Total Revenue",
      value: `PKR ${metrics.totalRevenue.toLocaleString()}`,
      subtitle: "Across all companies",
      icon: DollarSign,
      gradient: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50 dark:bg-violet-500/10",
      textColor: "text-violet-600 dark:text-violet-400",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
                <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.subtitle}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgLight}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
