import React from 'react'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'orange' | 'purple' | 'indigo'
  onClick?: () => void
  trend?: { value: number; isPositive: boolean }
}

const colorStyles: Record<NonNullable<StatCardProps['color']>, { bg: string; text: string; iconBg: string; gradient: string; hoverShadow: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
    text: 'text-blue-700 dark:text-blue-300',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
    gradient: 'from-blue-500 to-blue-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-blue-500/20',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    gradient: 'from-emerald-500 to-emerald-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-emerald-500/20',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10',
    text: 'text-rose-700 dark:text-rose-300',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
    gradient: 'from-rose-500 to-rose-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-rose-500/20',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10',
    text: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
    gradient: 'from-amber-500 to-amber-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-amber-500/20',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10',
    text: 'text-orange-700 dark:text-orange-300',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
    gradient: 'from-orange-500 to-orange-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-orange-500/20',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
    text: 'text-purple-700 dark:text-purple-300',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
    gradient: 'from-purple-500 to-purple-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-purple-500/20',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10',
    text: 'text-indigo-700 dark:text-indigo-300',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
    gradient: 'from-indigo-500 to-indigo-600',
    hoverShadow: 'hover:shadow-lg hover:shadow-indigo-500/20',
  },
}

export function StatCard({ title, value, icon, color = 'blue', onClick, trend }: StatCardProps) {
  const styles = colorStyles[color]

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-3.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60
        ${styles.bg}
        backdrop-blur-sm
        transition-all duration-300 ease-in-out
        hover:shadow-xl ${styles.hoverShadow} hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}
        group
      `}
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${styles.iconBg} shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 ${
            trend.isPositive 
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30' 
              : 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30'
          }`}>
            <span className="transition-transform duration-200 group-hover:scale-110">
              {trend.isPositive ? '↑' : '↓'}
            </span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{title}</p>
        <p className={`text-xl font-bold ${styles.text} transition-transform duration-200 group-hover:scale-105 origin-left`}>{value}</p>
      </div>
    </button>
  )
}
