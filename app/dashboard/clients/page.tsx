'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Client, Package, ServiceProvider } from '@prisma/client'
import {
  User, Phone, CreditCard, MapPin, Calendar, CheckCircle, AlertCircle, X,
  RefreshCw, Search, ChevronDown, ArrowUpDown, Edit2, Trash2, Plus,
  Wifi, Clock, IndianRupee, Mail, Hash, Building, Factory, FileText, AtSign,
  Ban, UserCheck
} from 'lucide-react'

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null }
  area?: { id: string; name: string; description: string | null } | null
}

interface ExtendedClient extends ClientWithPackage {
  email: any
  _count?: { payments: number }
  totalPaid?: number
  remainingAmount?: number
  effectivePaymentStatus?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ExtendedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'phone' | 'city' | 'area' | 'price' | 'expiryDate'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([])

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialStatusFilter = urlParams?.get('status') || 'all'
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'suspended'>(
    (initialStatusFilter as 'all' | 'active' | 'expired' | 'suspended') || 'all'
  )
  const initialAreaFilter = urlParams?.get('area') || 'all'
  const [filterArea, setFilterArea] = useState<string>(initialAreaFilter)
  const initialPaymentFilter = urlParams?.get('payment') || 'all'
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid' | 'partial'>(
    (initialPaymentFilter as 'all' | 'paid' | 'unpaid' | 'partial') || 'all'
  )
  const initialExpiringFilter = urlParams?.get('expiring') || 'none'
  const [expiringFilter, setExpiringFilter] = useState<'none' | 'today' | '3days' | '7days'>(
    (initialExpiringFilter as 'none' | 'today' | '3days' | '7days') || 'none'
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [showSuspendConfirm, setShowSuspendConfirm] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const router = useRouter()

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  // Use refs to prevent duplicate API calls
  const isMounted = useRef(false)
  const hasFetched = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchClients = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch('/api/clients', {
        credentials: 'include',
        cache: 'no-store',
        signal
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
        } else {
          showNotification('error', 'Failed to fetch clients')
        }
        return
      }

      const data: ExtendedClient[] = await res.json()
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setClients(data)
        setLoading(false)
      }
    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name !== 'AbortError') {
        console.error('Error fetching clients:', err)
        showNotification('error', 'Network error. Please try again.')
        if (isMounted.current) {
          router.push('/login')
          setLoading(false)
        }
      }
    }
  }, [router])

  useEffect(() => {
    // Prevent duplicate calls in React 18 StrictMode
    if (hasFetched.current) return
    hasFetched.current = true

    isMounted.current = true
    const controller = new AbortController()
    abortControllerRef.current = controller

    const checkAuthAndFetch = async () => {
      try {
        const res = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal
        })

        if (res.status === 401) {
          if (isMounted.current) {
            router.push('/login')
          }
          return
        }

        // Auth check passed, fetch clients
        await fetchClients(controller.signal)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Auth check failed:', err)
          if (isMounted.current) {
            router.push('/login')
            setLoading(false)
          }
        }
      }
    }

    checkAuthAndFetch()

    // Cleanup function
    return () => {
      isMounted.current = false
      hasFetched.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [router, fetchClients])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, filterStatus, filterArea, filterPayment, expiringFilter, itemsPerPage])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterArea !== 'all') params.set('area', filterArea)
    if (filterPayment !== 'all') params.set('payment', filterPayment)
    if (expiringFilter !== 'none') params.set('expiring', expiringFilter)
    if (params.toString()) {
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    } else {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [filterStatus, filterArea, filterPayment, expiringFilter])

  // Fetch areas for filter dropdown
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch('/api/areas', {
          credentials: 'include',
          cache: 'no-store'
        })
        if (res.ok) {
          const data = await res.json()
          setAreas(data)
        }
      } catch (err) {
        console.error('Error fetching areas:', err)
      }
    }
    fetchAreas()
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // This ensures cookies are sent with the request
      })
      if (res.ok) {
        setClients(clients.filter(client => client.id !== id))
        showNotification('success', 'Client deleted successfully')
        setShowDeleteConfirm(null)
      } else if (res.status === 401) {
        router.push('/login') // Redirect to login if unauthorized
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

  const handleGenerateInvoice = async (client: ExtendedClient) => {
    try {
      // Navigate to the invoice detail page
      router.push(`/dashboard/clients/${client.id}/invoice`);
      showNotification('success', `Navigating to invoice for ${client.name}`);
    } catch (err) {
      console.error('Error navigating to invoice:', err);
      showNotification('error', 'Failed to navigate to invoice');
    }
  }

  const handleSuspendToggle = async (id: string, currentStatus: string) => {
    setSuspendingId(id)
    try {
      const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setClients(clients.map(client =>
          client.id === id ? { ...client, status: newStatus } : client
        ))
        const action = newStatus === 'suspended' ? 'suspended' : 'reactivated'
        showNotification('success', `Client ${action} successfully`)
        setShowSuspendConfirm(null)
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to update client status')
      }
    } catch (err) {
      console.error('Error toggling client status:', err)
      showNotification('error', 'An error occurred while updating status')
    } finally {
      setSuspendingId(null)
    }
  }

  const filteredClients = clients
    .filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.username && client.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        client.phone.includes(searchTerm) ||
        client.cnic.includes(searchTerm) ||
        client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.areaName && client.areaName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.area?.name && client.area.name.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus
      const matchesArea = filterArea === 'all' || client.areaId === filterArea
      const matchesPayment = filterPayment === 'all' || (client.effectivePaymentStatus || client.paymentStatus) === filterPayment
      const now = new Date(); now.setHours(0, 0, 0, 0)
      const next3Days = new Date(now); next3Days.setDate(now.getDate() + 3)
      const next7Days = new Date(now); next7Days.setDate(now.getDate() + 7)
      let matchesExpiring = true
      if (expiringFilter === 'today') {
        const clientExpiry = new Date(client.expiryDate); clientExpiry.setHours(0, 0, 0, 0)
        matchesExpiring = clientExpiry.getTime() === now.getTime()
      } else if (expiringFilter === '3days') {
        const clientExpiry = new Date(client.expiryDate); clientExpiry.setHours(0, 0, 0, 0)
        matchesExpiring = clientExpiry.getTime() > now.getTime() && clientExpiry.getTime() <= next3Days.getTime()
      } else if (expiringFilter === '7days') {
        const clientExpiry = new Date(client.expiryDate); clientExpiry.setHours(0, 0, 0, 0)
        matchesExpiring = clientExpiry.getTime() > now.getTime() && clientExpiry.getTime() <= next7Days.getTime()
      }
      return matchesSearch && matchesStatus && matchesArea && matchesPayment && matchesExpiring
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'phone': comparison = a.phone.localeCompare(b.phone); break
        case 'city': comparison = a.city.localeCompare(b.city); break
        case 'area': comparison = (a.area?.name || a.areaName || '').localeCompare(b.area?.name || b.areaName || ''); break
        case 'price': comparison = (a.price || 0) - (b.price || 0); break
        case 'expiryDate': comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(); break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage)

  const formatPKR = (amount: number) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount)

  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  const isExpired = (expiryDate: Date | string) => new Date(expiryDate) < new Date()

  const getStatusStyles = (status: string, clientExpired: boolean) => {
    if (clientExpired) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      case 'suspended': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
    }
  }

  const getPaymentStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
      case 'unpaid': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
      case 'partial': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  if (loading) return <ClientsSkeleton />

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in backdrop-blur-xl border
          ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
          ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
          ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full"><AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" /></div>
              <div><h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Client?</h3><p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this client? All associated data will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} disabled={deletingId !== null} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
                {deletingId ? <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuspendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full ${
                clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended' ? (
                  <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Ban className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended'
                    ? 'Reactivate Client?'
                    : 'Suspend Client?'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended'
                    ? 'Restore client access'
                    : 'Temporarily disable client access'}
                </p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended'
                ? 'This will restore the client\'s access to services. You can suspend them again at any time.'
                : 'This will temporarily disable the client\'s access to services. Their data will be preserved and can be reactivated later.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSuspendConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSuspendToggle(showSuspendConfirm, clients.find(c => c.id === showSuspendConfirm)?.status || '')}
                disabled={suspendingId !== null}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2 ${
                  clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {suspendingId ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Updating...</>
                ) : clients.find(c => c.id === showSuspendConfirm)?.status === 'suspended' ? (
                  <><UserCheck className="w-4 h-4" /> Reactivate</>
                ) : (
                  <><Ban className="w-4 h-4" /> Suspend</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Top Controls Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-4">
        {/* Top Row: Title + Add Button */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">All Clients</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          <Link href="/dashboard/clients/new" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-sm">
            <Plus className="w-4 h-4" /> Add Client
          </Link>
        </div>

        {/* Bottom Row: Search + Filters */}
        <div className="flex flex-col gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, CNIC, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Filters Grid: 2 columns on mobile, more on larger screens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer whitespace-nowrap w-full"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Area Filter */}
            <div className="relative">
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer whitespace-nowrap w-full"
              >
                <option value="all">All Areas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Payment Filter */}
            <div className="relative">
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value as typeof filterPayment)}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer whitespace-nowrap w-full"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer whitespace-nowrap w-full"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="phone-asc">Phone (A-Z)</option>
                <option value="phone-desc">Phone (Z-A)</option>
                <option value="area-asc">Area (A-Z)</option>
                <option value="area-desc">Area (Z-A)</option>
                <option value="price-asc">Price (Low-High)</option>
                <option value="price-desc">Price (High-Low)</option>
                <option value="expiryDate-asc">Expiry (Soon-Late)</option>
                <option value="expiryDate-desc">Expiry (Late-Soon)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Items Per Page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer whitespace-nowrap w-full"
              >
                <option value={10}>10 / pg</option>
                <option value={50}>50 / pg</option>
                <option value={100}>100 / pg</option>
                <option value={500}>500 / pg</option>
                <option value={1000}>1000 / pg</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        {/* Mobile Card View - Compact */}
        <div className="sm:hidden overflow-hidden">
          {currentClients.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentClients.map((client, index) => {
                const clientExpired = isExpired(client.expiryDate)
                return (
                  <div key={client.id} className="p-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer" style={{ animationDelay: `${index * 50}ms` }} onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold shrink-0">
                        {indexOfFirstItem + index + 1}
                      </div>
                      <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-sm shadow-indigo-500/20 shrink-0"><User className="w-4 h-4 text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate text-xs">{client.name}</p>
                        {client.username && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1 truncate">
                            <AtSign className="w-3 h-3" />{client.username}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1"><Hash className="w-3 h-3" />{client.cnic}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200"><Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="truncate">{client.phone}</span></div>
                      {client.email && (<div className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{client.email}</span></div>)}
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200"><MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span className="truncate">{client.city}</span></div>
                      <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="truncate">{client.area?.name || client.areaName || '-'}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs">
                      <span className="font-medium text-gray-800 dark:text-white">{client.package?.name || 'No Package'}</span>
                      {client.package && <span className="text-gray-500 dark:text-gray-400">{client.package.speed} Mbps</span>}
                      {client.package?.serviceProvider && <span className="text-gray-500 dark:text-gray-400">{client.package.serviceProvider.name}</span>}
                    </div>
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(client.price || 0)}</span>
                      <div className={`flex items-center gap-1 ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        <Calendar className={`w-3.5 h-3.5 ${clientExpired ? 'text-rose-500' : 'text-amber-500'}`} /><span>{formatDate(client.expiryDate)}</span>
                        {clientExpired && <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full text-[10px]">Expired</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex flex-wrap gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStyles(client.effectivePaymentStatus || client.paymentStatus || 'unknown')}`}>
                          {client.effectivePaymentStatus
                            ? `${client.effectivePaymentStatus} - ${formatPKR(client.totalPaid || 0)}`
                            : `${client.paymentStatus || 'unknown'} - ${formatPKR(client.totalPaid || 0)}`
                          }
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusStyles(client.status || 'unknown', clientExpired)}`}>{clientExpired ? 'Expired' : client.status || 'unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client) }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Generate Invoice">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${client.id}/edit`) }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSuspendConfirm(client.id) }}
                          disabled={suspendingId === client.id || clientExpired}
                          className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            client.status === 'suspended'
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          }`}
                          title={client.status === 'suspended' ? 'Reactivate Client' : 'Suspend Client'}
                        >
                          {suspendingId === client.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : client.status === 'suspended' ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client.id) }} disabled={deletingId === client.id} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors disabled:opacity-50" title="Delete">
                          {deletingId === client.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full"><User className="w-10 h-10 opacity-50" /></div>
                <div><p className="font-semibold">No clients found</p><p className="text-xs mt-0.5">{searchTerm || filterStatus !== 'all' || filterArea !== 'all' || filterPayment !== 'all' ? 'Try adjusting your filters' : 'Add your first client'}</p></div>
                {(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (<Link href="/dashboard/clients/new" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Client</Link>)}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View - Compact */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Username</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Client</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Contact</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Area</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Package</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Price</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <button onClick={() => { setSortBy('expiryDate'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Expiry<ArrowUpDown className="w-3 h-3" /></button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Payment</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentClients.length > 0 ? (
                currentClients.map((client, index) => {
                  const clientExpired = isExpired(client.expiryDate)
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer" style={{ animationDelay: `${index * 50}ms` }} onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{indexOfFirstItem + index + 1}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {client.username ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 truncate max-w-[120px]">
                            <AtSign className="w-3.5 h-3.5 shrink-0" />{client.username}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div>
                          <p className="text-xs text-gray-900 dark:text-white font-medium truncate max-w-[140px]">{client.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5 shrink-0" />{client.cnic}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div>
                          <p className="text-xs text-gray-700 dark:text-gray-200">{client.phone}</p>
                          {client.email && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{client.email}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="text-xs text-gray-700 dark:text-gray-200 truncate max-w-[100px]">{client.area?.name || client.areaName || '-'}</p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div>
                          <p className="text-xs text-gray-900 dark:text-white font-medium truncate max-w-[120px]">{client.package?.name || 'No Package'}</p>
                          {client.package && <p className="text-[10px] text-gray-500 dark:text-gray-400">{client.package.speed} Mbps</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(client.price || 0)}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-xs ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-200'}`}>
                          <span className={clientExpired ? 'font-medium' : ''}>{formatDate(client.expiryDate)}</span>
                          {clientExpired && <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">Expired</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStyles(client.effectivePaymentStatus || client.paymentStatus || 'unknown')}`}>
                          {client.effectivePaymentStatus
                            ? `${client.effectivePaymentStatus} - ${formatPKR(client.totalPaid || 0)}`
                            : `${client.paymentStatus || 'unknown'} - ${formatPKR(client.totalPaid || 0)}`
                          }
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusStyles(client.status || 'unknown', clientExpired)}`}>{clientExpired ? 'Expired' : client.status || 'unknown'}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client) }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Generate Invoice">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${client.id}/edit`) }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowSuspendConfirm(client.id) }}
                            disabled={suspendingId === client.id || clientExpired}
                            className={`p-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              client.status === 'suspended'
                                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                            title={client.status === 'suspended' ? 'Reactivate Client' : 'Suspend Client'}
                          >
                            {suspendingId === client.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : client.status === 'suspended' ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client.id) }} disabled={deletingId === client.id} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors disabled:opacity-50" title="Delete">
                            {deletingId === client.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={11} className="px-4 py-12 text-center"><div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500"><div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full"><User className="w-10 h-10 opacity-50" /></div><div><p className="font-semibold">No clients found</p><p className="text-xs mt-0.5">{searchTerm || filterStatus !== 'all' || filterArea !== 'all' || filterPayment !== 'all' ? 'Try adjusting your filters' : 'Add your first client'}</p></div>{(!searchTerm && filterStatus === 'all' && filterArea === 'all' && filterPayment === 'all') && (<Link href="/dashboard/clients/new" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Client</Link>)}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Compact */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length}</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs">Previous</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum; if (totalPages <= 5) pageNum = i + 1; else if (currentPage <= 3) pageNum = i + 1; else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i; else pageNum = currentPage - 2 + i
                return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-2.5 py-1 rounded border transition-colors text-xs ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{pageNum}</button>)
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs">Next</button>
            </div>
          </div>
        )}

        {/* Table Footer - Compact */}
        {filteredClients.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Showing {currentClients.length} of {filteredClients.length} clients</span>
              <div className="flex flex-wrap items-center gap-3">
                <span>Total: <strong className="text-emerald-600 dark:text-emerald-400">{formatPKR(clients.reduce((sum, c) => sum + (c.price || 0), 0))}</strong></span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{clients.filter(c => (c.effectivePaymentStatus || c.paymentStatus) === 'paid').length} Paid</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-rose-500" />{clients.filter(c => (c.effectivePaymentStatus || c.paymentStatus) === 'unpaid').length} Unpaid</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ClientsSkeleton() {
  // Fixed widths to avoid hydration mismatch from Math.random()
  const cellWidths = ['w-8', 'w-24', 'w-32', 'w-28', 'w-24', 'w-28', 'w-20', 'w-28', 'w-24', 'w-20', 'w-24']

  return (
    <div className="space-y-4 animate-pulse">
      {/* Unified Top Bar Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-gray-100 dark:bg-gray-900 rounded-lg" /><div className="space-y-1.5"><div className="h-5 w-28 bg-gray-100 dark:bg-gray-900 rounded" /><div className="h-3 w-20 bg-gray-50 dark:bg-gray-800 rounded" /></div></div>
          <div className="h-9 w-28 bg-gray-100 dark:bg-gray-900 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-gray-50 dark:bg-gray-900 rounded-lg" />
          <div className="w-28 h-9 bg-gray-50 dark:bg-gray-900 rounded-lg" />
          <div className="w-28 h-9 bg-gray-50 dark:bg-gray-900 rounded-lg" />
          <div className="w-36 h-9 bg-gray-50 dark:bg-gray-900 rounded-lg" />
          <div className="w-20 h-9 bg-gray-50 dark:bg-gray-900 rounded-lg" />
        </div>
      </div>
      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
              <tr>{Array.from({ length: 11 }).map((_, i) => (<th key={i} className="px-3 py-3"><div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" /></th>))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {Array.from({ length: 5 }).map((_, row) => (
                <tr key={row}>{cellWidths.map((width, cell) => (
                  <td key={cell} className="px-3 py-2"><div className={`h-4 ${width} bg-gray-100 dark:bg-gray-900 rounded`} /></td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
