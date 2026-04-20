'use client'

import { AlertCircle, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ErrorListProps {
  errors: ValidationError[]
  errorCSV?: string | null
}

export function ErrorList({ errors, errorCSV }: ErrorListProps) {
  if (errors.length === 0) return null

  const downloadCSV = () => {
    if (!errorCSV) return
    
    const blob = new Blob([errorCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'import_errors.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="font-medium text-red-700 dark:text-red-400">
            {errors.length} Error{errors.length !== 1 ? 's' : ''} Found
          </span>
        </div>
        
        {errorCSV && (
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadCSV}
          >
            <Download className="w-4 h-4" />
            Download Error CSV
          </Button>
        )}
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-100/50 dark:bg-red-900/20 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-red-700 dark:text-red-400">
                Row
              </th>
              <th className="px-4 py-2 text-left font-medium text-red-700 dark:text-red-400">
                Field
              </th>
              <th className="px-4 py-2 text-left font-medium text-red-700 dark:text-red-400">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-red-200/50 dark:divide-red-800/50">
            {errors.slice(0, 50).map((error, idx) => (
              <tr key={idx} className="hover:bg-red-100/30 dark:hover:bg-red-900/20">
                <td className="px-4 py-2 text-red-600 dark:text-red-300">
                  {error.row}
                </td>
                <td className="px-4 py-2 text-red-600 dark:text-red-300 font-medium">
                  {error.field}
                </td>
                <td className="px-4 py-2 text-red-600 dark:text-red-300">
                  {error.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {errors.length > 50 && (
          <div className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400 bg-red-100/30 dark:bg-red-900/20">
            Showing first 50 errors. Download full error CSV for complete list.
          </div>
        )}
      </div>
    </div>
  )
}