'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package as PackageType, ServiceProvider } from '@prisma/client'
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Wifi,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  Factory
} from 'lucide-react'

interface ExtendedPackage extends PackageType {
  _count?: {
    clients: number
  }
  serviceProvider?: ServiceProvider | null
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<ExtendedPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'purchasePrice' | 'speed' | 'duration'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const router = useRouter()

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const fetchPackages = async () => {
      try {
        const res = await fetch('/api/packages', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        })

        if (res.ok) {
          const data = await res.json()
          setPackages(data)
        } else if (res.status === 401) {
          router.push('/login')
        } else {
          showNotification('error', 'Failed to fetch packages')
        }
      } catch (err) {
        console.error('Error fetching packages:', err)
        showNotification('error', 'Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [router])

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (res.ok) {
        setPackages(packages.filter(pkg => pkg.id !== id))
        showNotification('success', 'Package deleted successfully')
        setShowDeleteConfirm(null)
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to delete package')
      }
    } catch (err) {
      console.error('Error deleting package:', err)
      showNotification('error', 'An error occurred while deleting')
    } finally {
      setDeletingId(null)
    }
  }

  // Filter and sort packages
  const filteredPackages = packages
    .filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.price - b.price
          break
        case 'purchasePrice':
          comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0)
          break
        case 'speed':
          comparison = a.speed - b.speed
          break
        case 'duration':
          comparison = a.durationDays - b.durationDays
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Format PKR currency
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return <PackagesSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3
          animate-slide-in backdrop-blur-xl border
          ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
          ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
          ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}
        `}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Package?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this package? All associated clients will need to be reassigned.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId !== null}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
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
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:text-slate-800 dark:to-gray-300 bg-clip-text text-transparent">
            Packages
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage your internet service packages and pricing
          </p>
        </div>
        <Link
          href="/dashboard/packages/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Package
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
              }}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Sale Price (Low-High)</option>
              <option value="price-desc">Sale Price (High-Low)</option>
              <option value="purchasePrice-asc">Purchase Price (Low-High)</option>
              <option value="purchasePrice-desc">Purchase Price (High-Low)</option>
              <option value="speed-asc">Speed (Low-High)</option>
              <option value="speed-desc">Speed (High-Low)</option>
              <option value="duration-asc">Duration (Short-Long)</option>
              <option value="duration-desc">Duration (Long-Short)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Packages</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              setTimeout(() => setLoading(false), 500)
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-sm font-medium text-slate-500 dark:text-gray-400">
                <th className="px-6 py-4">Package Name</th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('speed')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Speed
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('price')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Sale Price (PKR)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('purchasePrice')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Purchase Price (PKR)
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('duration')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Duration
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">Service Provider</th>
                <th className="px-6 py-4">Clients</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredPackages.length > 0 ? (
                filteredPackages.map((pkg, index) => (
                  <tr
                    key={pkg.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-linear-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
                          <Wifi className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{pkg.name}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">ID: {pkg.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-slate-700 dark:text-gray-200">{pkg.speed} Mbps</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* <IndianRupee className="w-4 h-4 text-emerald-500" /> */}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(pkg.price)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-rose-500" />
                        <span className="font-bold text-rose-600 dark:text-rose-400">{formatPKR(pkg.purchasePrice || 0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="text-slate-700 dark:text-gray-200">{pkg.durationDays} days</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-purple-500" />
                        <span className="text-slate-700 dark:text-gray-200">{pkg.serviceProvider?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        (pkg._count?.clients || 0) > 0
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {pkg._count?.clients || 0} active
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/packages/${pkg.id}/edit`}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
                          title="Edit package"
                        >
                          <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </Link>
                        <button
                          onClick={() => setShowDeleteConfirm(pkg.id)}
                          disabled={deletingId === pkg.id}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn disabled:opacity-50"
                          title="Delete package"
                        >
                          {deletingId === pkg.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                      <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
                        <Package className="w-12 h-12 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">No packages found</p>
                        <p className="text-sm mt-1">
                          {searchTerm ? `No results for "${searchTerm}"` : 'Get started by creating your first package'}
                        </p>
                      </div>
                      {!searchTerm && (
                        <Link
                          href="/dashboard/packages/new"
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Create Package
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredPackages.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-gray-400">
              <span>Showing {filteredPackages.length} of {packages.length} packages</span>
              <div className="flex items-center gap-4">
                <span>Total Value: <strong className="text-emerald-600 dark:text-emerald-400">{formatPKR(packages.reduce((sum, pkg) => sum + pkg.price, 0))}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== SKELETON LOADING ==================== */

function PackagesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-48 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
                  <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
                <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



// 'use client'

//   import { useEffect, useState } from 'react'
//   import { useRouter } from 'next/navigation'
//   import Link from 'next/link'
//   import { Package } from '@prisma/client'

//   export default function PackagesPage() {
//     const [packages, setPackages] = useState<Package[]>([])
//     const [loading, setLoading] = useState(true)
//     const router = useRouter()

//     useEffect(() => {
//       const token = localStorage.getItem('token')
//       if (!token) {
//         router.push('/login')
//         return
//       }

//       const fetchPackages = async () => {
//         try {
//           const res = await fetch('/api/packages', {
//             headers: {
//               'Authorization': `Bearer ${token}`
//             }
//           })

//           if (res.ok) {
//             const data = await res.json()
//             setPackages(data)
//           } else {
//             router.push('/login')
//           }
//         } catch (err) {
//           console.error('Error fetching packages:', err)
//           router.push('/login')
//         } finally {
//           setLoading(false)
//         }
//       }

//       fetchPackages()
//     }, [router])

//     const handleDelete = async (id: string) => {
//       const token = localStorage.getItem('token')
//       if (!token) return

//       if (confirm('Are you sure you want to delete this package?')) {
//         try {
//           const res = await fetch(`/api/packages/${id}`, {
//             method: 'DELETE',
//             headers: {
//               'Authorization': `Bearer ${token}`
//             }
//           })

//           if (res.ok) {
//             setPackages(packages.filter(pkg => pkg.id !== id))
//           } else {
//             alert('Failed to delete package')
//           }
//         } catch (err) {
//           console.error('Error deleting package:', err)
//           alert('An error occurred')
//         }
//       }
//     }

//     if (loading) {
//       return (
//         <div className="flex justify-center items-center h-full">
//           <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
//         </div>
//       )
//     }

//     return (
//       <div>
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-2xl font-bold">Packages</h1>
//           <Link
//             href="/dashboard/packages/new"
//             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
//           >
//             Add New Package
//           </Link>
//         </div>

//         <div className="bg-white shadow-md rounded-lg overflow-hidden">
//           <table className="min-w-full leading-normal">
//             <thead>
//               <tr>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Name
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Speed (Mbps)
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Price
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Duration (Days)
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {packages.map((pkg) => (
//                 <tr key={pkg.id}>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {pkg.name}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {pkg.speed}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     ${pkg.price.toFixed(2)}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {pkg.durationDays}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     <Link
//                       href={`/dashboard/packages/${pkg.id}/edit`}
//                       className="text-blue-600 hover:text-blue-900 mr-3"
//                     >
//                       Edit
//                     </Link>
//                     <button
//                       onClick={() => handleDelete(pkg.id)}
//                       className="text-red-600 hover:text-red-900"
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     )
//   }