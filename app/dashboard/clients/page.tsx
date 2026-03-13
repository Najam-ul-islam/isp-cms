'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Client, Package, ServiceProvider } from '@prisma/client'
import {
  User,
  Phone,
  CreditCard,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Search,
  ChevronDown,
  ArrowUpDown,
  Edit2,
  Trash2,
  Plus,
  Wifi,
  Clock,
  IndianRupee,
  Mail,
  Hash,
  Building,
  Factory
} from 'lucide-react'

interface ClientWithPackage extends Client {
  package: Package & {
    serviceProvider?: ServiceProvider | null;
  };
}

interface ExtendedClient extends ClientWithPackage {
  email: any
  _count?: {
    payments: number
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ExtendedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'city' | 'area' | 'price' | 'expiryDate'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'suspended'>('all')
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid' | 'pending'>('all')
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

    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        })

        if (res.ok) {
          const data: ExtendedClient[] = await res.json()
          setClients(data)
        } else if (res.status === 401) {
          router.push('/login')
        } else {
          showNotification('error', 'Failed to fetch clients')
        }
      } catch (err) {
        console.error('Error fetching clients:', err)
        showNotification('error', 'Network error. Please try again.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [router])

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (res.ok) {
        setClients(clients.filter(client => client.id !== id))
        showNotification('success', 'Client deleted successfully')
        setShowDeleteConfirm(null)
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to delete client')
      }
    } catch (err) {
      console.error('Error deleting client:', err)
      showNotification('error', 'An error occurred while deleting')
    } finally {
      setDeletingId(null)
    }
  }

  // Filter and sort clients
  const filteredClients = clients
    .filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.cnic.includes(searchTerm) ||
        client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.area.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus
      const matchesPayment = filterPayment === 'all' || client.paymentStatus === filterPayment
      
      return matchesSearch && matchesStatus && matchesPayment
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'phone':
          comparison = a.phone.localeCompare(b.phone)
          break
        case 'city':
          comparison = a.city.localeCompare(b.city)
          break
        case 'area':
          comparison = (a.area || '').localeCompare(b.area || '')
          break
        case 'price':
          comparison = (a.price || 0) - (b.price || 0)
          break
        case 'expiryDate':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
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

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Check if client is expired
  const isExpired = (expiryDate: Date | string) => {
    return new Date(expiryDate) < new Date()
  }

  // Get status badge styles
  const getStatusStyles = (status: string, clientExpired: boolean) => {
    if (clientExpired) {
      return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    }
    switch (status) {
      case 'active':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      case 'suspended':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
    }
  }

  // Get payment badge styles
  const getPaymentStyles = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
      case 'unpaid':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  if (loading) {
    return <ClientsSkeleton />
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Client?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this client? All associated data will be permanently removed.
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
            Clients
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage your internet service clients and subscriptions
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add New Client
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, CNIC, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Payment Filter */}
          <div className="relative">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as typeof filterPayment)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-40"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="phone-asc">Phone (A-Z)</option>
              <option value="phone-desc">Phone (Z-A)</option>
              <option value="city-asc">City (A-Z)</option>
              <option value="city-desc">City (Z-A)</option>
              <option value="area-asc">Area (A-Z)</option>
              <option value="area-desc">Area (Z-A)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="expiryDate-asc">Expiry (Soon-Late)</option>
              <option value="expiryDate-desc">Expiry (Late-Soon)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-linear-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Clients</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
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
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('city')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    City
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">Area</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Service Provider</th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('price')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Price
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => {
                      setSortBy('expiryDate')
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                    }}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Expiry
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {filteredClients.length > 0 ? (
                filteredClients.map((client, index) => {
                  const clientExpired = isExpired(client.expiryDate)
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Client Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{client.name}</p>
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {client.cnic}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                            {client.phone}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* City */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
                          <MapPin className="w-4 h-4 text-amber-500" />
                          {client.city}
                        </div>
                      </td>

                      {/* Area */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          {client.area || '-'}
                        </div>
                      </td>

                      {/* Package */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">
                            {client.package?.name || 'No Package'}
                          </p>
                          {client.package && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                              <Wifi className="w-3 h-3" />
                              {client.package.speed} Mbps
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Service Provider */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">
                            {client.package?.serviceProvider?.name || 'No Provider'}
                          </p>
                          {client.package?.serviceProvider && (
                            <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                              <Factory className="w-3 h-3" />
                              {client.package.purchasePrice ? `Cost: ${formatPKR(client.package.purchasePrice)}` : 'Cost: N/A'}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPKR(client.price || 0)}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 text-sm ${
                          clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'
                        }`}>
                          <Calendar className={`w-4 h-4 ${clientExpired ? 'text-rose-500' : 'text-amber-500'}`} />
                          <span className={clientExpired ? 'font-medium' : ''}>
                            {formatDate(client.expiryDate)}
                          </span>
                          {clientExpired && (
                            <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          getPaymentStyles(client.paymentStatus || 'unknown')
                        }`}>
                          {client.paymentStatus || 'unknown'}
                        </span>
                      </td>

                      {/* Client Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          getStatusStyles(client.status || 'unknown', clientExpired)
                        }`}>
                          {clientExpired ? 'Expired' : client.status || 'unknown'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/clients/${client.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
                            title="Edit client"
                          >
                            <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </Link>
                          <button
                            onClick={() => setShowDeleteConfirm(client.id)}
                            disabled={deletingId === client.id}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn disabled:opacity-50"
                            title="Delete client"
                          >
                            {deletingId === client.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
                      <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
                        <User className="w-12 h-12 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">No clients found</p>
                        <p className="text-sm mt-1">
                          {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
                            ? 'Try adjusting your filters or search terms'
                            : 'Get started by adding your first client'}
                        </p>
                      </div>
                      {(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (
                        <Link
                          href="/dashboard/clients/new"
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Add Client
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
        {filteredClients.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-gray-400">
              <span>Showing {filteredClients.length} of {clients.length} clients</span>
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Total Revenue: <strong className="text-emerald-600 dark:text-emerald-400">
                    {formatPKR(clients.reduce((sum, c) => sum + (c.price || 0), 0))}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {clients.filter(c => c.paymentStatus === 'paid').length} Paid
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  {clients.filter(c => c.paymentStatus === 'unpaid').length} Unpaid
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== SKELETON LOADING ==================== */

function ClientsSkeleton() {
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
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
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-28 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
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
//   import { Client, Package } from '@prisma/client'

//   interface ClientWithPackage extends Client {
//     package: Package;
//   }

//   export default function ClientsPage() {
//     const [clients, setClients] = useState<ClientWithPackage[]>([])
//     const [loading, setLoading] = useState(true)
//     const router = useRouter()

//     useEffect(() => {
//       const token = localStorage.getItem('token')
//       if (!token) {
//         router.push('/login')
//         return
//       }

//       const fetchClients = async () => {
//         try {
//           const res = await fetch('/api/clients', {
//             headers: {
//               'Authorization': `Bearer ${token}`
//             }
//           })

//           if (res.ok) {
//             const data: ClientWithPackage[] = await res.json()
//             setClients(data)
//           } else {
//             if (res.status === 401) {
//               router.push('/login')
//               return
//             }
//             throw new Error('Failed to fetch clients')
//           }
//         } catch (err) {
//           console.error('Error fetching clients:', err)
//           router.push('/login')
//         } finally {
//           setLoading(false)
//         }
//       }

//       fetchClients()
//     }, [router])

//     const handleDelete = async (id: string) => {
//       if (!id) {
//         alert('Invalid client ID');
//         return;
//       }

//       const token = localStorage.getItem('token')
//       if (!token) {
//         router.push('/login')
//         return
//       }

//       if (confirm('Are you sure you want to delete this client?')) {
//         try {
//           const res = await fetch(`/api/clients/${id}`, {
//             method: 'DELETE',
//             headers: {
//               'Content-Type': 'application/json',
//               'Authorization': `Bearer ${token}`
//             }
//           })

//           if (res.ok) {
//             // Remove the client from the UI immediately upon successful deletion
//             setClients(clients.filter(client => client.id !== id));
//           } else {
//             if (res.status === 401) {
//               router.push('/login')
//               return
//             }
//             const errorData = await res.json()
//             alert(errorData.error || 'Failed to delete client')
//           }
//         } catch (err) {
//           console.error('Error deleting client:', err)
//           alert('An error occurred while deleting the client')
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
//           <h1 className="text-2xl font-bold">Clients</h1>
//           <Link
//             href="/dashboard/clients/new"
//             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
//           >
//             Add New Client
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
//                   Phone
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   CNIC
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   City
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Package
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Price
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Expiry Date
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Payment Status
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Status
//                 </th>
//                 <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase
//   tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {clients.map((client) => (
//                 <tr key={client.id}>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.name}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.phone}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.cnic}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.city}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.package && typeof client.package === 'object'
//                       ? `${client.package.name || 'Unknown Package'} (${client.package.speed || 'N/A'} Mbps)`
//                       : client.packageId || 'No Package'}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {typeof client.price === 'number' ? `PKR ${client.price.toFixed(2)}` : 'PKR 0.00'}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     {client.expiryDate instanceof Date
//                       ? client.expiryDate.toLocaleDateString()
//                       : new Date(client.expiryDate).toLocaleDateString()}
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                       client.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
//                       client.paymentStatus === 'unpaid' ? 'bg-red-100 text-red-800' :
//                       'bg-yellow-100 text-yellow-800'
//                     }`}>
//                       {client.paymentStatus || 'unknown'}
//                     </span>
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                       client.status === 'active' ? 'bg-green-100 text-green-800' :
//                       client.status === 'expired' ? 'bg-red-100 text-red-800' :
//                       'bg-yellow-100 text-yellow-800'
//                     }`}>
//                       {client.status || 'unknown'}
//                     </span>
//                   </td>
//                   <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
//                     <Link
//                       href={`/dashboard/clients/${client.id}/edit`}
//                       className="text-blue-600 hover:text-blue-900 mr-3"
//                       prefetch={false} // Prevent pre-fetching which might cause issues
//                     >
//                       Edit
//                     </Link>
//                     <button
//                       onClick={() => client.id && handleDelete(client.id)}
//                       className="text-red-600 hover:text-red-900 cursor-pointer"
//                       disabled={!client.id} // Disable if client id is somehow undefined
//                     >
//                       {!client.id ? '...' : 'Delete'}
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