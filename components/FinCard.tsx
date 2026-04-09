import React from 'react'

interface FinCardProps {
  title: string
  amount: number
  type: 'income' | 'due' | 'upcoming'
  icon: React.ReactNode
  onClick?: () => void
  subtitle?: string
}

export default function FinCard({ title, amount, type, icon, onClick, subtitle }: FinCardProps) {
  const styles = {
    income: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/60 dark:border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
      hoverBg: 'hover:bg-emerald-50/80 dark:hover:bg-emerald-500/5',
      shadow: 'hover:shadow-emerald-500/10',
      valueGradient: 'from-emerald-600 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300',
    },
    due: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
      border: 'border-rose-200/60 dark:border-rose-500/20',
      hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500/40',
      hoverBg: 'hover:bg-rose-50/80 dark:hover:bg-rose-500/5',
      shadow: 'hover:shadow-rose-500/10',
      valueGradient: 'from-rose-600 to-rose-500 dark:from-rose-400 dark:to-rose-300',
    },
    upcoming: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/60 dark:border-amber-500/20',
      hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500/40',
      hoverBg: 'hover:bg-amber-50/80 dark:hover:bg-amber-500/5',
      shadow: 'hover:shadow-amber-500/10',
      valueGradient: 'from-amber-600 to-amber-500 dark:from-amber-400 dark:to-amber-300',
    },
  }

  const typeStyles = styles[type]

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-2xl border ${typeStyles.border} ${typeStyles.bg}
        ${typeStyles.hoverBorder} ${typeStyles.hoverBg} ${typeStyles.shadow}
        hover:-translate-y-1
        transition-all duration-300 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-${type === 'income' ? 'emerald' : type === 'due' ? 'rose' : 'amber'}-500/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
      aria-label={`${title}: ${subtitle || 'Rs'} ${amount.toLocaleString('en-PK')}`}
    >
      <div className="flex justify-between items-start mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <div className={`p-2 rounded-lg ${typeStyles.iconBg} transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        {subtitle && <span className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</span>}
        <span className={`text-2xl font-bold bg-gradient-to-r ${typeStyles.valueGradient} bg-clip-text text-transparent`}>
          {amount.toLocaleString('en-PK')}
        </span>
      </div>
    </button>
  )
}
