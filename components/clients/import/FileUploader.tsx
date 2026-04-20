'use client'

import { Upload, X, FileText } from 'lucide-react'
import { useCallback, useState } from 'react'

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
}

export function FileUploader({ onFileSelect, selectedFile }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    const ext = file.name.toLowerCase().split('.').pop()
    const validExtensions = ['csv', 'xlsx', 'xls']
    
    if (!ext || !validExtensions.includes(ext)) {
      return 'Please select a CSV or Excel file (.csv, .xlsx, .xls)'
    }
    if (file.size === 0) {
      return 'File is empty'
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return 'File size exceeds 10MB limit'
    }
    return null
  }, [])

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleClear = useCallback(() => {
    onFileSelect(null)
    setError(null)
  }, [onFileSelect])

  const downloadTemplate = useCallback(() => {
    const headers = 'User ID,Full Name,Area,Package,Monthly Fee'
    const exampleRow = 'USER001,John Doe,Lahore,Basic,1500'
    const csv = `${headers}\n${exampleRow}`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'client_import_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="space-y-4">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`
            p-3 rounded-full
            ${isDragging ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}
          `}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag and drop your CSV or Excel file here
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              or click to browse
            </p>
          </div>
          
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Supported formats: CSV, Excel (.xlsx, .xls) - Max 10MB
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <X className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={downloadTemplate}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Download CSV Template
        </button>
      </div>
    </div>
  )
}