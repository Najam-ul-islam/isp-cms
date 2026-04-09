import React from 'react'

interface ResponsiveTableProps {
  headers: { key: string; label: string; className?: string }[]
  data: any[]
  renderRow: (item: any) => React.ReactNode
  renderCell?: (item: any, key: string) => React.ReactNode
  className?: string
  onRowClick?: (item: any) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  data,
  renderRow,
  renderCell,
  className = '',
  onRowClick,
  emptyMessage = 'No data found',
  emptyIcon
}) => {
  return (
    <div className="w-full">
      {/* Desktop/Tablet View - Traditional Table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800/90">
        <table className={`min-w-full divide-y divide-gray-200/60 dark:divide-gray-700/60 ${className}`}>
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/30">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header.key}
                  scope="col"
                  className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider ${header.className || ''}`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200/60 dark:divide-gray-700/60">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr
                  key={index}
                  className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 dark:hover:from-blue-900/20 dark:hover:to-purple-900/10 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(item)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onRowClick(item)
                    }
                  }}
                >
                  {renderRow(item)}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-6 py-16 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200/70 dark:from-gray-700 dark:to-gray-600/50 rounded-2xl">
                      {emptyIcon || (
                        <svg className="w-10 h-10 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      )}
                    </div>
                    <p className="font-semibold text-gray-600 dark:text-gray-300">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {data.length > 0 ? (
          data.map((item, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 shadow-sm transition-all duration-200 ${
                onRowClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5' : ''
              }`}
              onClick={() => onRowClick && onRowClick(item)}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onRowClick(item)
                }
              }}
            >
              <div className="space-y-2.5">
                {headers.map((header) => (
                  <div key={header.key} className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{header.label}:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-300 text-sm text-right flex-1 break-words pl-2">
                      {renderCell ? renderCell(item, header.key) : item[header.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-8 text-center">
            <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
              <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200/70 dark:from-gray-700 dark:to-gray-600/50 rounded-2xl">
                {emptyIcon || (
                  <svg className="w-10 h-10 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                )}
              </div>
              <p className="font-semibold">{emptyMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
