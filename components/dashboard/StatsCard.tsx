'use client';

import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple';
  trend?: { value: number; positive: boolean };
  onClick?: () => void;
}

export default function StatsCard({
  title,
  value,
  icon,
  color,
  trend,
  onClick
}: StatsCardProps) {
  const colors = {
    blue: {
      bg: "from-blue-50 to-blue-100/50",
      icon: "bg-blue-500",
      text: "text-blue-600",
      border: "border-blue-200",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100/50",
      icon: "bg-emerald-500",
      text: "text-emerald-600",
      border: "border-emerald-200",
    },
    rose: {
      bg: "from-rose-50 to-rose-100/50",
      icon: "bg-rose-500",
      text: "text-rose-600",
      border: "border-rose-200",
    },
    amber: {
      bg: "from-amber-50 to-amber-100/50",
      icon: "bg-amber-500",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    purple: {
      bg: "from-purple-50 to-purple-100/50",
      icon: "bg-purple-500",
      text: "text-purple-600",
      border: "border-purple-200",
    },
  };

  const c = colors[color];

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 shadow-sm border ${c.border} hover:shadow-md transition-all duration-300 group overflow-hidden ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      {/* Decorative gradient blob */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity`}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()}
          </p>

          {trend && (
            <div
              className={`flex items-center gap-1 text-sm ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}
            >
              {trend.positive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span className="font-medium">{trend.value}%</span>
              <span className="text-slate-400">vs last period</span>
            </div>
          )}
        </div>

        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${c.icon} shadow-lg shadow-${color}-500/25 text-white`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}