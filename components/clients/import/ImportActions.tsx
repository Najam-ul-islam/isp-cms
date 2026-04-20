'use client'

import { Button } from '@/components/ui/Button'
import { Play, Upload } from 'lucide-react'

interface ImportActionsProps {
  onDryRun: () => void
  onImport: () => void
  isLoading: boolean
  loadingType: 'dryRun' | 'import' | null
  disabled: boolean
  hasFile: boolean
}

export function ImportActions({
  onDryRun,
  onImport,
  isLoading,
  loadingType,
  disabled,
  hasFile,
}: ImportActionsProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Ready to import
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Validate your data first with dry run, or import directly
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onDryRun}
          disabled={disabled || !hasFile}
          loading={loadingType === 'dryRun'}
        >
          <Play className="w-4 h-4" />
          Validate (Dry Run)
        </Button>
        
        <Button
          variant="success"
          size="md"
          onClick={onImport}
          disabled={disabled || !hasFile}
          loading={loadingType === 'import'}
        >
          <Upload className="w-4 h-4" />
          {loadingType === 'import' ? 'Importing...' : 'Import Clients'}
        </Button>
      </div>
    </div>
  )
}