'use client'

import { useState, useCallback } from 'react'
import { FileUploader } from '@/components/clients/import/FileUploader'
import { ImportActions } from '@/components/clients/import/ImportActions'
import { ImportResults } from '@/components/clients/import/ImportResults'
import { ErrorList } from '@/components/clients/import/ErrorList'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Users, AlertCircle } from 'lucide-react'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ImportResultData {
  total: number
  valid: number
  inserted: number
  failed: number
  skipped?: number
  warnings?: string[]
  errorCSV?: string
}

export default function ImportClientsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'dryRun' | 'import' | null>(null)
  const [result, setResult] = useState<ImportResultData | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isSuccess, setIsSuccess] = useState(false)
  const [isDryRun, setIsDryRun] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  const handleDryRun = useCallback(async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setLoadingType('dryRun')
    setIsDryRun(true)
    setResult(null)
    setErrors([])
    setIsSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/clients/upload?dryRun=true', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setResult({
        total: data.total,
        valid: data.valid,
        inserted: 0,
        failed: data.failed,
        warnings: data.warnings || [],
      })
      setErrors(data.errors || [])
      setIsSuccess(data.failed === 0)

      if (data.failed === 0) {
        showNotification('success', 'Validation successful - ready to import')
      } else {
        showNotification('info', `Found ${data.failed} errors in your data`)
      }
    } catch (err: any) {
      setErrors([{ row: 0, field: 'upload', message: err.message }])
      setIsSuccess(false)
      showNotification('error', err.message || 'Validation failed')
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }, [selectedFile, showNotification])

  const handleImport = useCallback(async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setLoadingType('import')
    setIsDryRun(false)
    setResult(null)
    setErrors([])
    setIsSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/clients/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResult({
        total: data.total,
        valid: data.valid,
        inserted: data.inserted,
        failed: data.failed,
        skipped: data.skipped,
        warnings: [],
      })
      setErrors(data.errors || [])
      setIsSuccess(data.inserted > 0)

      if (data.inserted > 0) {
        showNotification('success', `Successfully imported ${data.inserted} clients`)
      } else if (data.failed > 0) {
        showNotification('error', `Import failed - ${data.failed} errors`)
      } else {
        showNotification('error', 'Import failed - no clients were imported')
      }
    } catch (err: any) {
      setErrors([{ row: 0, field: 'upload', message: err.message }])
      setIsSuccess(false)
      showNotification('error', err.message || 'Import failed')
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }, [selectedFile, showNotification])

  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setResult(null)
    setErrors([])
    setIsSuccess(false)
    setIsDryRun(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-blue-600" />
              Import Clients
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Upload CSV file to bulk import clients
            </p>
          </div>
        </div>

        {notification && (
          <div className={`
            flex items-center gap-3 px-4 py-3 rounded-xl border
            ${notification.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
              : notification.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }
          `}>
            {notification.type === 'success' && (
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {notification.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className={`
              text-sm font-medium
              ${notification.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : ''}
              ${notification.type === 'error' ? 'text-red-700 dark:text-red-400' : ''}
              ${notification.type === 'info' ? 'text-blue-700 dark:text-blue-400' : ''}
            `}>
              {notification.message}
            </span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file containing client data. Only client identity and package information will be imported.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          </CardContent>
        </Card>

        <ImportActions
          onDryRun={handleDryRun}
          onImport={handleImport}
          isLoading={isLoading}
          loadingType={loadingType}
          disabled={isLoading}
          hasFile={!!selectedFile}
        />

        {result && (
          <ImportResults
            result={result}
            isSuccess={isSuccess}
            isDryRun={isDryRun}
          />
        )}

        {errors.length > 0 && (
          <ErrorList
            errors={errors}
            errorCSV={result?.errorCSV}
          />
        )}

        {result && (
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Import More Clients
            </button>
          </div>
        )}
      </div>
    </div>
  )
}