import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
  icon?: React.ReactNode
  dot?: boolean
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700/80 dark:text-gray-200 ring-1 ring-inset ring-gray-600/20 dark:ring-gray-400/20',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-400/20',
}

export function Badge({ children, variant = 'default', className = '', icon, dot }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
        transition-all duration-200
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === 'success' ? 'bg-emerald-600 dark:bg-emerald-400' :
          variant === 'warning' ? 'bg-amber-600 dark:bg-amber-400' :
          variant === 'danger' ? 'bg-red-600 dark:bg-red-400' :
          variant === 'info' ? 'bg-blue-600 dark:bg-blue-400' :
          'bg-gray-600 dark:bg-gray-400'
        } animate-pulse`} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
