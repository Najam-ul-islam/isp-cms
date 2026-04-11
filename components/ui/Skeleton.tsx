import React from 'react'

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'button' | 'card' | 'table-row'
  width?: string
  height?: string
  className?: string
  count?: number
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  count = 1 
}: SkeletonProps) {
  const baseStyles = 'skeleton relative overflow-hidden'
  
  const variantStyles = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    button: 'h-10 rounded-xl',
    card: 'h-32 rounded-2xl',
    'table-row': 'h-16 rounded-lg',
  }

  const style = {
    width,
    height,
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${baseStyles} ${variantStyles[variant]} ${className}`}
          style={style}
          aria-hidden="true"
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
      ))}
    </>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton variant="circular" width="48px" height="48px" />
        <Skeleton variant="text" width="60px" className="h-6" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="70%" className="h-8" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="200px" className="h-8" />
          <Skeleton variant="text" width="150px" />
        </div>
        <Skeleton variant="button" width="120px" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Table */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
        <TableSkeleton rows={5} />
      </div>
    </div>
  )
}
