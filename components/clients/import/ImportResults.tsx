'use client'

import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

interface ImportResultData {
  total: number
  valid: number
  inserted: number
  failed: number
  skipped?: number
  warnings?: string[]
}

interface ImportResultsProps {
  result: ImportResultData | null
  isSuccess: boolean
  isDryRun: boolean
}

export function ImportResults({ result, isSuccess, isDryRun }: ImportResultsProps) {
  if (!result) return null

  const getStatusIcon = () => {
    if (isSuccess) {
      return <CheckCircle className="w-6 h-6 text-emerald-500" />
    }
    if (result.failed > 0 && result.inserted > 0) {
      return <AlertTriangle className="w-6 h-6 text-amber-500" />
    }
    return <XCircle className="w-6 h-6 text-red-500" />
  }

  const getStatusTitle = () => {
    if (isSuccess && result.inserted > 0) {
      return isDryRun 
        ? 'Validation Successful' 
        : 'Import Completed Successfully'
    }
    if (result.failed > 0 && result.inserted > 0) {
      return 'Import Completed with Errors'
    }
    return 'Import Failed'
  }

  const getStatusDescription = () => {
    if (isDryRun) {
      return `Found ${result.valid} valid rows out of ${result.total} total rows. Ready to import when you proceed.`
    }
    if (isSuccess && result.inserted > 0) {
      return `Successfully imported ${result.inserted} clients.`
    }
    return 'No clients were imported due to errors.'
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className={`p-2 rounded-full ${isSuccess ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
          {getStatusIcon()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {getStatusTitle()}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getStatusDescription()}
          </p>
        </div>
      </div>

      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {result.total}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Total Rows
          </p>
        </div>

        <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {result.valid}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Valid Rows
          </p>
        </div>

        {isDryRun ? (
          <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {result.failed}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Errors
            </p>
          </div>
        ) : (
          <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {result.inserted}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              Inserted
            </p>
          </div>
        )}

        {!isDryRun && result.failed > 0 && (
          <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {result.failed}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Failed
            </p>
          </div>
        )}
      </div>

      {result.skipped !== undefined && result.skipped > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>{result.skipped} rows were skipped (duplicate data)</span>
          </div>
        </div>
      )}

      {result.warnings && result.warnings.length > 0 && (
        <div className="px-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Info className="w-4 h-4" />
              <span className="font-medium">Warnings:</span>
            </div>
            <ul className="ml-6 space-y-1">
              {result.warnings.slice(0, 5).map((warning, idx) => (
                <li key={idx} className="text-sm text-amber-600 dark:text-amber-400">
                  {warning}
                </li>
              ))}
              {result.warnings.length > 5 && (
                <li className="text-sm text-amber-600 dark:text-amber-400">
                  ...and {result.warnings.length - 5} more warnings
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}