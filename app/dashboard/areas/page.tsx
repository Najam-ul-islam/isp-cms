'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin,
  Users,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Search,
  RefreshCw
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Area {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: {
    clients: number
  }
}

interface ToastNotification {
  type: 'success' | 'error' | 'info'
  message: string
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function AreasPage() {
  const router = useRouter()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notification, setNotification] = useState<ToastNotification | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // ─────────────────────────────────────────────────────────
  // Notification Helper
  // ─────────────────────────────────────────────────────────
  const showNotification = useCallback((type: ToastNotification['type'], message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // ─────────────────────────────────────────────────────────
  // Fetch Areas
  // ─────────────────────────────────────────────────────────
  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch('/api/areas', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setAreas(data)
      } else {
        showNotification('error', 'Failed to fetch areas')
      }
    } catch (err) {
      console.error('Error fetching areas:', err)
      showNotification('error', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router, showNotification])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  // ─────────────────────────────────────────────────────────
  // Handle Add Area
  // ─────────────────────────────────────────────────────────
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      showNotification('error', 'Area name is required')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        showNotification('success', `Area "${data.name}" created successfully`)
        setName('')
        setDescription('')
        // Add the new area to the list immediately
        setAreas(prev => [...prev, data])
      } else {
        showNotification('error', data.error || 'Failed to create area')
      }
    } catch (err) {
      console.error('Error creating area:', err)
      showNotification('error', 'An error occurred while creating the area')
    } finally {
      setSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Handle Delete Area
  // ─────────────────────────────────────────────────────────
  const handleDeleteArea = async (id: string) => {
    const areaToDelete = areas.find(a => a.id === id)
    if (!areaToDelete) return

    setDeletingId(id)

    try {
      const res = await fetch(`/api/areas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await res.json()

      if (res.ok) {
        showNotification('success', `Area "${areaToDelete.name}" deleted successfully`)
        setAreas(prev => prev.filter(a => a.id !== id))
        setDeleteConfirmId(null)
      } else {
        showNotification('error', data.error || 'Failed to delete area')
        setDeleteConfirmId(null)
      }
    } catch (err) {
      console.error('Error deleting area:', err)
      showNotification('error', 'An error occurred while deleting the area')
      setDeleteConfirmId(null)
    } finally {
      setDeletingId(null)
    }
  }

  // ─────────────────────────────────────────────────────────
  // Filtered Areas
  // ─────────────────────────────────────────────────────────
  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (area.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  // ─────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return <AreasSkeleton />
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          role="alert"
          aria-live="polite"
          className={`
            fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3
            animate-slide-in backdrop-blur-xl border max-w-md
            ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
            ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-medium text-sm">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70 flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200/60 dark:border-gray-700/60">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Delete Area?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            {(() => {
              const area = areas.find(a => a.id === deleteConfirmId)
              if (!area) return null

              const hasClients = area._count.clients > 0

              if (hasClients) {
                return (
                  <>
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-700/60 rounded-xl mb-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                            Cannot delete this area
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            &ldquo;{area.name}&rdquo; has <strong>{area._count.clients}</strong> client(s) assigned to it. Remove or reassign the clients first.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 ease-out font-medium border border-transparent hover:border-gray-200/60 dark:hover:border-gray-600/60"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/clients?area=${deleteConfirmId}`)}
                        className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg
                                   border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                                   hover:bg-blue-600 dark:hover:bg-blue-500
                                   hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
                                   transition-all duration-200 ease-out font-medium"
                      >
                        View Clients
                      </button>
                    </div>
                  </>
                )
              }

              return (
                <>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete <strong className="text-gray-900 dark:text-gray-50">&ldquo;{area.name}&rdquo;</strong>?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={deletingId !== null}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 ease-out font-medium border border-transparent hover:border-gray-200/60 dark:hover:border-gray-600/60 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDeleteArea(deleteConfirmId)}
                      disabled={deletingId !== null}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg
                                 border border-transparent hover:border-rose-400/60
                                 hover:shadow-lg hover:shadow-rose-500/20
                                 transition-all duration-200 ease-out font-medium
                                 disabled:opacity-50 flex items-center gap-2
                                 focus:ring-2 focus:ring-rose-500/50 focus:outline-none"
                    >
                      {deletingId === deleteConfirmId ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Areas
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage service areas and coverage zones
          </p>
        </div>
      </div>

      {/* Add Area Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden
                      transition-all duration-300 ease-out
                      hover:border-blue-500/60 dark:hover:border-blue-400/60
                      hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                      hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10">
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-linear-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Add New Area</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Define a service area for client assignment
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAddArea} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area Name */}
            <div className="lg:col-span-1">
              <label htmlFor="area-name" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Area Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="area-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sector F-8, Islamabad"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all duration-200 ease-out text-gray-900 dark:text-white placeholder-gray-400"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="lg:col-span-1">
              <label htmlFor="area-description" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                Description <span className="text-gray-400 dark:text-gray-500 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="area-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the area"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                             transition-all duration-200 ease-out text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5
                           bg-linear-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-700
                           hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-500 dark:hover:to-blue-600
                           text-white font-semibold rounded-xl
                           shadow-lg shadow-blue-500/25
                           hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5
                           transition-all duration-200 ease-out
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg
                           focus:ring-2 focus:ring-blue-500/50 focus:outline-none
                           focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Area
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search areas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                         transition-all duration-200 ease-out text-gray-900 dark:text-white placeholder-gray-400"
              aria-label="Search areas"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-200/60 dark:border-gray-600/60">
              <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {filteredAreas.length} area{filteredAreas.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-200/60 dark:border-gray-600/60">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {areas.reduce((sum, a) => sum + a._count.clients, 0)} total clients
              </span>
            </div>
            <button
              onClick={fetchAreas}
              className="p-2 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 border border-transparent hover:border-gray-200/60 dark:hover:border-gray-600/60 rounded-lg transition-all duration-200 ease-out group"
              title="Refresh areas"
              aria-label="Refresh areas list"
            >
              <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Areas List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        {/* List Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-violet-50/50 to-transparent dark:from-violet-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <MapPin className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">
                All Areas
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredAreas.length} area{filteredAreas.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {filteredAreas.length > 0 ? (
          <div className="divide-y dark:divide-gray-700">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                           transition-all duration-300 ease-out
                           hover:bg-gray-50/80 dark:hover:bg-gray-700/50
                           hover:border-l-2 hover:border-l-blue-500"
              >
                {/* Area Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0
                                  border border-gray-200/60 dark:border-gray-600/60">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                      {area.name}
                    </h3>
                    {area.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {area.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full
                                       bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300
                                       border border-blue-200/60 dark:border-blue-700/60">
                        <Users className="w-3 h-3" />
                        {area._count.clients} client{area._count.clients !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Created {new Date(area.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <button
                    onClick={() => setDeleteConfirmId(area.id)}
                    disabled={deletingId === area.id}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
                      border transition-all duration-200 ease-out
                      focus:ring-2 focus:ring-rose-500/50 focus:outline-none
                      ${area._count.clients > 0
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 border-gray-200/60 dark:border-gray-600/60 cursor-not-allowed opacity-60'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-700/60'
                      }
                      ${area._count.clients === 0
                        ? 'hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:border-rose-300 dark:hover:border-rose-600/60 hover:shadow-sm'
                        : ''
                      }
                      disabled:opacity-50
                    `}
                    aria-label={`Delete area ${area.name}`}
                    title={area._count.clients > 0 ? 'Cannot delete: has assigned clients' : 'Delete area'}
                  >
                    {deletingId === area.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {area._count.clients > 0 ? 'Has Clients' : 'Delete'}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="px-6 py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4
                            border border-gray-200/60 dark:border-gray-600/60">
              <MapPin className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {searchTerm ? 'No areas match your search' : 'No areas found'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search term.`
                : 'Get started by adding your first service area above.'
              }
            </p>
          </div>
        )}

        {/* Footer */}
        {filteredAreas.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                Showing {filteredAreas.length} of {areas.length} area{areas.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4">
                <span>
                  Clients covered:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {areas.reduce((sum, a) => sum + a._count.clients, 0)}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Skeleton Loading Component
// ─────────────────────────────────────────────────────────────
function AreasSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>

      {/* Add Area Form Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
          <div className="flex items-end">
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4">
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>

      {/* List Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>

        {/* List Item Skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-6 py-4 border-b dark:border-gray-700 last:border-b-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
