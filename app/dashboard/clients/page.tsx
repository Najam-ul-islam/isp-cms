'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Client, Package, ServiceProvider } from '@prisma/client'
import {
  User, Phone, CreditCard, MapPin, Calendar, CheckCircle, AlertCircle, X,
  RefreshCw, Search, ChevronDown, ArrowUpDown, Edit2, Trash2, Plus,
  Wifi, Clock, IndianRupee, Mail, Hash, Building, Factory, FileText
} from 'lucide-react'

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null }
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

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialStatusFilter = urlParams?.get('status') || 'all'
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'suspended'>(
    (initialStatusFilter as 'all' | 'active' | 'expired' | 'suspended') || 'all'
  )
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const router = useRouter()

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    // Check if user is authenticated by making a simple API call
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include' // This ensures cookies are sent with the request
        })

        if (res.status === 401) {
          router.push('/login')
          return
        }

        const fetchClients = async () => {
          try {
            const res = await fetch('/api/clients', {
              credentials: 'include', // This ensures cookies are sent with the request
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
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => { setCurrentPage(1) }, [searchTerm, filterStatus, filterPayment, expiringFilter, itemsPerPage])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterPayment !== 'all') params.set('payment', filterPayment)
    if (expiringFilter !== 'none') params.set('expiring', expiringFilter)
    if (params.toString()) {
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    } else {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [filterStatus, filterPayment, expiringFilter])

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

  const filteredClients = clients
    .filter(client => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.cnic.includes(searchTerm) ||
        client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.area && client.area.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus
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
      return matchesSearch && matchesStatus && matchesPayment && matchesExpiring
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'phone': comparison = a.phone.localeCompare(b.phone); break
        case 'city': comparison = a.city.localeCompare(b.city); break
        case 'area': comparison = (a.area || '').localeCompare(b.area || ''); break
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-14 lg:mt-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:text-slate-800 dark:to-gray-300 bg-clip-text text-transparent">Clients</h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">Manage your internet service clients and subscriptions</p>
        </div>
        <Link href="/dashboard/clients/new" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
          <Plus className="w-5 h-5" /> Add New Client
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by name, phone, CNIC, or city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400" />
          </div>
          <div className="relative">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35">
              <option value="all">All Status</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as typeof filterPayment)} className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35">
              <option value="all">All Payments</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="partial">Partial</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]; setSortBy(newSortBy); setSortOrder(newSortOrder) }} className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-40">
              <option value="name-asc">Name (A-Z)</option><option value="name-desc">Name (Z-A)</option><option value="phone-asc">Phone (A-Z)</option><option value="phone-desc">Phone (Z-A)</option><option value="area-asc">Area (A-Z)</option><option value="area-desc">Area (Z-A)</option><option value="price-asc">Price (Low-High)</option><option value="price-desc">Price (High-Low)</option><option value="expiryDate-asc">Expiry (Soon-Late)</option><option value="expiryDate-desc">Expiry (Late-Soon)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-24">
              <option value={10}>10 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={500}>500 / page</option>
              <option value={1000}>1000 / page</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-linear-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
            <div><h2 className="font-semibold text-slate-800 dark:text-white">All Clients</h2><p className="text-sm text-slate-500 dark:text-gray-400">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found</p></div>
          </div>
          <button onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500) }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group" title="Refresh"><RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`} /></button>
        </div>

        {/* Mobile Card View - Compact */}
        <div className="sm:hidden overflow-hidden">
          {currentClients.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-gray-700">
              {currentClients.map((client, index) => {
                const clientExpired = isExpired(client.expiryDate)
                return (
                  <div key={client.id} className="p-3 hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer" style={{ animationDelay: `${index * 50}ms` }} onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold shrink-0">
                        {indexOfFirstItem + index + 1}
                      </div>
                      <div className="p-2 bg-linear-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/20 shrink-0"><User className="w-4 h-4 text-white" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-white truncate text-sm">{client.name}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1"><Hash className="w-3 h-3" />{client.cnic}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-gray-200"><Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="truncate">{client.phone}</span></div>
                      {client.email && (<div className="flex items-center gap-1 text-slate-500 dark:text-gray-400"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{client.email}</span></div>)}
                      <div className="flex items-center gap-1 text-slate-700 dark:text-gray-200"><MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /><span className="truncate">{client.city}</span></div>
                      <div className="flex items-center gap-1 text-slate-700 dark:text-gray-200"><MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="truncate">{client.area || '-'}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs">
                      <span className="font-medium text-slate-800 dark:text-white">{client.package?.name || 'No Package'}</span>
                      {client.package && <span className="text-slate-500 dark:text-gray-400">{client.package.speed} Mbps</span>}
                      {client.package?.serviceProvider && <span className="text-slate-500 dark:text-gray-400">{client.package.serviceProvider.name}</span>}
                    </div>
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(client.price || 0)}</span>
                      <div className={`flex items-center gap-1 ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'}`}>
                        <Calendar className={`w-3.5 h-3.5 ${clientExpired ? 'text-rose-500' : 'text-amber-500'}`} /><span>{formatDate(client.expiryDate)}</span>
                        {clientExpired && <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full text-[10px]">Expired</span>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-700">
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
              <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-gray-500">
                <div className="p-3 bg-slate-100 dark:bg-gray-800 rounded-full"><User className="w-10 h-10 opacity-50" /></div>
                <div><p className="font-semibold">No clients found</p><p className="text-xs mt-0.5">{searchTerm || filterStatus !== 'all' || filterPayment !== 'all' ? 'Try adjusting your filters' : 'Add your first client'}</p></div>
                {(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (<Link href="/dashboard/clients/new" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Client</Link>)}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table View - Compact */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 dark:bg-gray-900/50">
              <tr className="text-left text-xs font-medium text-slate-500 dark:text-gray-400">
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Contact</th>
                <th className="px-4 py-2.5">Area</th>
                <th className="px-4 py-2.5">Package</th>
                <th className="px-4 py-2.5">Provider</th>
                <th className="px-4 py-2.5"><button onClick={() => { setSortBy('price'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">Price<ArrowUpDown className="w-3 h-3" /></button></th>
                <th className="px-4 py-2.5"><button onClick={() => { setSortBy('expiryDate'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">Expiry<ArrowUpDown className="w-3 h-3" /></button></th>
                <th className="px-4 py-2.5">Payment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
              {currentClients.length > 0 ? (
                currentClients.map((client, index) => {
                  const clientExpired = isExpired(client.expiryDate)
                  return (
                    <tr key={client.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group cursor-pointer" style={{ animationDelay: `${index * 50}ms` }} onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium text-slate-600 dark:text-gray-300">{indexOfFirstItem + index + 1}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div><p className="text-sm text-slate-800 dark:text-white font-medium">{client.name}</p><p className="text-[10px] text-slate-500 dark:text-gray-400 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{client.cnic}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><div className="space-y-0.5"><p className="text-sm text-slate-700 dark:text-gray-200">{client.phone}</p>{client.email && <p className="text-[10px] text-slate-500 dark:text-gray-400">{client.email}</p>}</div></td>
                      <td className="px-4 py-2.5"><p className="text-sm text-slate-700 dark:text-gray-200">{client.area || '-'}</p></td>
                      <td className="px-4 py-2.5"><div className="space-y-0.5"><p className="text-sm text-slate-800 dark:text-white">{client.package?.name || 'No Package'}</p>{client.package && <p className="text-[10px] text-slate-500 dark:text-gray-400">{client.package.speed} Mbps</p>}</div></td>
                      <td className="px-4 py-2.5"><div className="space-y-0.5"><p className="text-sm text-slate-800 dark:text-white">{client.package?.serviceProvider?.name || 'No Provider'}</p>{client.package?.serviceProvider && <p className="text-[10px] text-slate-500 dark:text-gray-400">{client.package.purchasePrice ? formatPKR(client.package.purchasePrice) : 'N/A'}</p>}</div></td>
                      <td className="px-4 py-2.5"><span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(client.price || 0)}</span></td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1 text-sm ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'}`}>
                          <span className={clientExpired ? 'font-medium' : ''}>{formatDate(client.expiryDate)}</span>
                          {clientExpired && <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">Expired</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStyles(client.effectivePaymentStatus || client.paymentStatus || 'unknown')}`}>
                        {client.effectivePaymentStatus
                          ? `${client.effectivePaymentStatus} - ${formatPKR(client.totalPaid || 0)}`
                          : `${client.paymentStatus || 'unknown'} - ${formatPKR(client.totalPaid || 0)}`
                        }
                      </span></td>
                      <td className="px-4 py-2.5"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusStyles(client.status || 'unknown', clientExpired)}`}>{clientExpired ? 'Expired' : client.status || 'unknown'}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(client) }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Generate Invoice">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/clients/${client.id}/edit`) }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client.id) }} disabled={deletingId === client.id} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors disabled:opacity-50" title="Delete">
                            {deletingId === client.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan={11} className="px-4 py-12 text-center"><div className="flex flex-col items-center gap-3 text-slate-400 dark:text-gray-500"><div className="p-3 bg-slate-100 dark:bg-gray-800 rounded-full"><User className="w-10 h-10 opacity-50" /></div><div><p className="font-semibold">No clients found</p><p className="text-sm mt-0.5">{searchTerm || filterStatus !== 'all' || filterPayment !== 'all' ? 'Try adjusting your filters' : 'Add your first client'}</p></div>{(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (<Link href="/dashboard/clients/new" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"><Plus className="w-3.5 h-3.5" /> Add Client</Link>)}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Compact */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-gray-400">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length}</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1 rounded border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-xs">Previous</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum; if (totalPages <= 5) pageNum = i + 1; else if (currentPage <= 3) pageNum = i + 1; else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i; else pageNum = currentPage - 2 + i
                return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-2.5 py-1 rounded border transition-colors text-xs ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'}`}>{pageNum}</button>)
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1 rounded border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors text-xs">Next</button>
            </div>
          </div>
        )}

        {/* Table Footer - Compact */}
        {filteredClients.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-gray-400">
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
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5"><div className="h-7 w-40 bg-slate-200 dark:bg-gray-700 rounded" /><div className="h-3.5 w-60 bg-slate-100 dark:bg-gray-800 rounded" /></div>
        <div className="h-9 w-36 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-slate-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 h-9 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-32 h-9 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-32 h-9 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-36 h-9 bg-slate-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700"><div className="h-4 w-32 bg-slate-200 dark:bg-gray-700 rounded" /></div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
                <div className="space-y-1.5"><div className="h-3.5 w-28 bg-slate-100 dark:bg-gray-900 rounded" /><div className="h-2.5 w-20 bg-slate-50 dark:bg-gray-800 rounded" /></div>
              </div>
              <div className="h-3.5 w-20 bg-slate-100 dark:bg-gray-900 rounded" /><div className="h-3.5 w-16 bg-slate-100 dark:bg-gray-900 rounded" /><div className="h-3.5 w-24 bg-slate-100 dark:bg-gray-900 rounded" /><div className="h-3.5 w-16 bg-slate-100 dark:bg-gray-900 rounded" /><div className="h-3.5 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="flex gap-1"><div className="w-7 h-7 bg-slate-100 dark:bg-gray-900 rounded" /><div className="w-7 h-7 bg-slate-100 dark:bg-gray-900 rounded" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}





// 'use client'

// import { useEffect, useState } from 'react'
// import { useRouter } from 'next/navigation'
// import Link from 'next/link'
// import { Client, Package, ServiceProvider } from '@prisma/client'
// import {
//   User,
//   Phone,
//   CreditCard,
//   MapPin,
//   Calendar,
//   CheckCircle,
//   AlertCircle,
//   X,
//   RefreshCw,
//   Search,
//   ChevronDown,
//   ArrowUpDown,
//   Edit2,
//   Trash2,
//   Plus,
//   Wifi,
//   Clock,
//   IndianRupee,
//   Mail,
//   Hash,
//   Building,
//   Factory
// } from 'lucide-react'

// interface ClientWithPackage extends Client {
//   package: Package & {
//     serviceProvider?: ServiceProvider | null;
//   };
// }

// interface ExtendedClient extends ClientWithPackage {
//   email: any
//   _count?: {
//     payments: number
//   }
// }

// export default function ClientsPage() {
//   const [clients, setClients] = useState<ExtendedClient[]>([])
//   const [loading, setLoading] = useState(true)
//   const [searchTerm, setSearchTerm] = useState('')
//   const [sortBy, setSortBy] = useState<'name' | 'phone' | 'city' | 'area' | 'price' | 'expiryDate'>('name')
//   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

//   // Initialize filters based on URL query parameters
//   const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

//   const initialStatusFilter = urlParams?.get('status') || 'all';
//   const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'suspended'>(
//     initialStatusFilter as 'all' | 'active' | 'expired' | 'suspended' || 'all'
//   );

//   const initialPaymentFilter = urlParams?.get('payment') || 'all';
//   const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid' | 'pending'>(
//     initialPaymentFilter as 'all' | 'paid' | 'unpaid' | 'pending' || 'all'
//   );

//   const initialExpiringFilter = urlParams?.get('expiring') || 'none';
//   const [expiringFilter, setExpiringFilter] = useState<'none' | 'today' | '3days' | '7days'>(
//     initialExpiringFilter as 'none' | 'today' | '3days' | '7days' || 'none'
//   );
//   const [deletingId, setDeletingId] = useState<string | null>(null)
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
//   const [notification, setNotification] = useState<{
//     type: 'success' | 'error' | 'info'
//     message: string
//   } | null>(null)
//   const [currentPage, setCurrentPage] = useState(1)
//   const [itemsPerPage] = useState(5) // Show 5 clients per page (can be changed to 10 if needed)
//   const router = useRouter()

//   // Show notification
//   const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
//     setNotification({ type, message })
//     setTimeout(() => setNotification(null), 4000)
//   }

//   useEffect(() => {
//     const token = localStorage.getItem('token')
//     if (!token) {
//       router.push('/login')
//       return
//     }

//     const fetchClients = async () => {
//       try {
//         const res = await fetch('/api/clients', {
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           cache: 'no-store'
//         })

//         if (res.ok) {
//           const data: ExtendedClient[] = await res.json()
//           setClients(data)
//         } else if (res.status === 401) {
//           router.push('/login')
//         } else {
//           showNotification('error', 'Failed to fetch clients')
//         }
//       } catch (err) {
//         console.error('Error fetching clients:', err)
//         showNotification('error', 'Network error. Please try again.')
//         router.push('/login')
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchClients()
//   }, [router])

//   // Update URL when filters change
//   useEffect(() => {
//     const params = new URLSearchParams();

//     if (filterStatus !== 'all') {
//       params.set('status', filterStatus);
//     }

//     if (filterPayment !== 'all') {
//       params.set('payment', filterPayment);
//     }

//     if (expiringFilter !== 'none') {
//       params.set('expiring', expiringFilter);
//     }

//     // Only update URL if there are parameters to show
//     if (params.toString()) {
//       const newUrl = `${window.location.pathname}?${params.toString()}`;
//       window.history.replaceState({}, '', newUrl);
//     } else {
//       // If no filters, remove query parameters
//       window.history.replaceState({}, '', window.location.pathname);
//     }
//   }, [filterStatus, filterPayment, expiringFilter]);

//   const handleDelete = async (id: string) => {
//     const token = localStorage.getItem('token')
//     if (!token) return

//     setDeletingId(id)
//     try {
//       const res = await fetch(`/api/clients/${id}`, {
//         method: 'DELETE',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       })

//       if (res.ok) {
//         setClients(clients.filter(client => client.id !== id))
//         showNotification('success', 'Client deleted successfully')
//         setShowDeleteConfirm(null)
//       } else {
//         const error = await res.json()
//         showNotification('error', error.message || 'Failed to delete client')
//       }
//     } catch (err) {
//       console.error('Error deleting client:', err)
//       showNotification('error', 'An error occurred while deleting')
//     } finally {
//       setDeletingId(null)
//     }
//   }

//   // Filter and sort clients
//   const filteredClients = clients
//     .filter(client => {
//       const matchesSearch =
//         client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         client.phone.includes(searchTerm) ||
//         client.cnic.includes(searchTerm) ||
//         client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         (client.area && client.area.toLowerCase().includes(searchTerm.toLowerCase()))

//       const matchesStatus = filterStatus === 'all' || client.status === filterStatus
//       const matchesPayment = filterPayment === 'all' || (client.effectivePaymentStatus || client.paymentStatus) === filterPayment

//       // Handle expiring filter
//       const now = new Date();
//       now.setHours(0, 0, 0, 0);
//       const tomorrow = new Date(now);
//       tomorrow.setDate(now.getDate() + 1);
//       const next3Days = new Date(now);
//       next3Days.setDate(now.getDate() + 3);
//       const next7Days = new Date(now);
//       next7Days.setDate(now.getDate() + 7);

//       let matchesExpiring = true; // Default to true if no expiring filter

//       if (expiringFilter === 'today') {
//         const clientExpiry = new Date(client.expiryDate);
//         clientExpiry.setHours(0, 0, 0, 0);
//         matchesExpiring = clientExpiry.getTime() === now.getTime();
//       } else if (expiringFilter === '3days') {
//         const clientExpiry = new Date(client.expiryDate);
//         clientExpiry.setHours(0, 0, 0, 0);
//         matchesExpiring = clientExpiry.getTime() > now.getTime() && clientExpiry.getTime() <= next3Days.getTime();
//       } else if (expiringFilter === '7days') {
//         const clientExpiry = new Date(client.expiryDate);
//         clientExpiry.setHours(0, 0, 0, 0);
//         matchesExpiring = clientExpiry.getTime() > now.getTime() && clientExpiry.getTime() <= next7Days.getTime();
//       }

//       return matchesSearch && matchesStatus && matchesPayment && matchesExpiring
//     })
//     .sort((a, b) => {
//       let comparison = 0
//       switch (sortBy) {
//         case 'name':
//           comparison = a.name.localeCompare(b.name)
//           break
//         case 'phone':
//           comparison = a.phone.localeCompare(b.phone)
//           break
//         case 'city':
//           comparison = a.city.localeCompare(b.city)
//           break
//         case 'area':
//           comparison = (a.area || '').localeCompare(b.area || '')
//           break
//         case 'price':
//           comparison = (a.price || 0) - (b.price || 0)
//           break
//         case 'expiryDate':
//           comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
//           break
//       }
//       return sortOrder === 'asc' ? comparison : -comparison
//     })

//   // Apply pagination
//   const indexOfLastItem = currentPage * itemsPerPage
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage
//   const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem)
//   const totalPages = Math.ceil(filteredClients.length / itemsPerPage)

//   // Format PKR currency
//   const formatPKR = (amount: number) => {
//     return new Intl.NumberFormat('en-PK', {
//       style: 'currency',
//       currency: 'PKR',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     }).format(amount)
//   }

//   // Format date
//   const formatDate = (date: Date | string) => {
//     return new Date(date).toLocaleDateString('en-PK', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric'
//     })
//   }

//   // Check if client is expired
//   const isExpired = (expiryDate: Date | string) => {
//     return new Date(expiryDate) < new Date()
//   }

//   // Get status badge styles
//   const getStatusStyles = (status: string, clientExpired: boolean) => {
//     if (clientExpired) {
//       return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
//     }
//     switch (status) {
//       case 'active':
//         return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
//       case 'suspended':
//         return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
//       default:
//         return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
//     }
//   }

//   // Get payment badge styles
//   const getPaymentStyles = (status: string) => {
//     switch (status) {
//       case 'paid':
//         return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
//       case 'unpaid':
//         return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
//       case 'pending':
//         return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
//       default:
//         return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
//     }
//   }

//   if (loading) {
//     return <ClientsSkeleton />
//   }

//   return (
//     <div className="space-y-6">
//       {/* Notification Toast */}
//       {notification && (
//         <div className={`
//           fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3
//           animate-slide-in backdrop-blur-xl border
//           ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
//           ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
//           ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}
//         `}>
//           {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
//           {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
//           {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
//           <span className="font-medium">{notification.message}</span>
//           <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
//             <X className="w-4 h-4" />
//           </button>
//         </div>
//       )}

//       {/* Delete Confirmation Modal */}
//       {showDeleteConfirm && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
//             <div className="flex items-center gap-4 mb-4">
//               <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-full">
//                 <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
//               </div>
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Client?</h3>
//                 <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
//               </div>
//             </div>
//             <p className="text-gray-600 dark:text-gray-300 mb-6">
//               Are you sure you want to delete this client? All associated data will be permanently removed.
//             </p>
//             <div className="flex gap-3 justify-end">
//               <button
//                 onClick={() => setShowDeleteConfirm(null)}
//                 className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => handleDelete(showDeleteConfirm)}
//                 disabled={deletingId !== null}
//                 className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
//               >
//                 {deletingId ? (
//                   <>
//                     <RefreshCw className="w-4 h-4 animate-spin" />
//                     Deleting...
//                   </>
//                 ) : (
//                   <>
//                     <Trash2 className="w-4 h-4" />
//                     Delete
//                   </>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-14 lg:mt-0">
//         <div>
//           <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:text-slate-800 dark:to-gray-300 bg-clip-text text-transparent">
//             Clients
//           </h1>
//           <p className="text-slate-500 dark:text-gray-400 mt-1">
//             Manage your internet service clients and subscriptions
//           </p>
//         </div>
//         <Link
//           href="/dashboard/clients/new"
//           className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
//         >
//           <Plus className="w-5 h-5" />
//           Add New Client
//         </Link>
//       </div>

//       {/* Filters & Search */}
//       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
//         <div className="flex flex-col lg:flex-row gap-4">
//           {/* Search */}
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search by name, phone, CNIC, or city..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
//             />
//           </div>

//           {/* Status Filter */}
//           <div className="relative">
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
//               className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
//             >
//               <option value="all">All Status</option>
//               <option value="active">Active</option>
//               <option value="expired">Expired</option>
//               <option value="suspended">Suspended</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>

//           {/* Payment Filter */}
//           <div className="relative">
//             <select
//               value={filterPayment}
//               onChange={(e) => setFilterPayment(e.target.value as typeof filterPayment)}
//               className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-35"
//             >
//               <option value="all">All Payments</option>
//               <option value="paid">Paid</option>
//               <option value="unpaid">Unpaid</option>
//               <option value="pending">Pending</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>

//           {/* Sort */}
//           <div className="relative">
//             <select
//               value={`${sortBy}-${sortOrder}`}
//               onChange={(e) => {
//                 const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
//                 setSortBy(newSortBy)
//                 setSortOrder(newSortOrder)
//               }}
//               className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white cursor-pointer min-w-40"
//             >
//               <option value="name-asc">Name (A-Z)</option>
//               <option value="name-desc">Name (Z-A)</option>
//               <option value="phone-asc">Phone (A-Z)</option>
//               <option value="phone-desc">Phone (Z-A)</option>
//               <option value="city-asc">City (A-Z)</option>
//               <option value="city-desc">City (Z-A)</option>
//               <option value="area-asc">Area (A-Z)</option>
//               <option value="area-desc">Area (Z-A)</option>
//               <option value="price-asc">Price (Low-High)</option>
//               <option value="price-desc">Price (High-Low)</option>
//               <option value="expiryDate-asc">Expiry (Soon-Late)</option>
//               <option value="expiryDate-desc">Expiry (Late-Soon)</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>
//         </div>
//       </div>

//       {/* Clients Table */}
//       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
//         {/* Table Header */}
//         <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-linear-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
//           <div className="flex items-center gap-3">
//             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
//               <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
//             </div>
//             <div>
//               <h2 className="font-semibold text-slate-800 dark:text-white">All Clients</h2>
//               <p className="text-sm text-slate-500 dark:text-gray-400">
//                 {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} found
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={() => {
//               setLoading(true)
//               setTimeout(() => setLoading(false), 500)
//             }}
//             className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
//             title="Refresh"
//           >
//             <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
//           </button>
//         </div>

//         {/* Table Content - Mobile Card View */}
//         <div className="sm:hidden overflow-hidden">
//           {currentClients.length > 0 ? (
//             <div className="divide-y divide-slate-100 dark:divide-gray-700">
//               {currentClients.map((client, index) => {
//                 const clientExpired = isExpired(client.expiryDate)
//                 return (
//                   <div
//                     key={client.id}
//                     className="p-4 hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
//                     style={{ animationDelay: `${index * 50}ms` }}
//                   >
//                     {/* Client Info */}
//                     <div className="flex items-start gap-3 mb-3">
//                       <div className="p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
//                         <User className="w-4 h-4 text-white" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="font-semibold text-slate-800 dark:text-white truncate">{client.name}</p>
//                         <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                           <Hash className="w-3 h-3" />
//                           {client.cnic}
//                         </p>
//                       </div>
//                     </div>

//                     {/* Contact */}
//                     <div className="space-y-2 mb-3">
//                       <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                         <Phone className="w-4 h-4 text-blue-500 shrink-0" />
//                         <span className="truncate">{client.phone}</span>
//                       </div>
//                       {client.email && (
//                         <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
//                           <Mail className="w-4 h-4 shrink-0" />
//                           <span className="truncate">{client.email}</span>
//                         </div>
//                       )}
//                     </div>

//                     {/* City & Area */}
//                     <div className="grid grid-cols-2 gap-4 mb-3">
//                       <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                         <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
//                         <span className="truncate">{client.city}</span>
//                       </div>
//                       <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                         <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
//                         <span className="truncate">{client.area || '-'}</span>
//                       </div>
//                     </div>

//                     {/* Package & Service Provider */}
//                     <div className="space-y-2 mb-3">
//                       <div className="space-y-1">
//                         <p className="font-medium text-slate-800 dark:text-white text-sm">
//                           {client.package?.name || 'No Package'}
//                         </p>
//                         {client.package && (
//                           <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                             <Wifi className="w-3 h-3" />
//                             {client.package.speed} Mbps
//                           </p>
//                         )}
//                       </div>
//                       {client.package?.serviceProvider && (
//                         <div className="space-y-1">
//                           <p className="font-medium text-slate-800 dark:text-white text-sm">
//                             {client.package.serviceProvider.name}
//                           </p>
//                           <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                             <Factory className="w-3 h-3" />
//                             {client.package.purchasePrice ? `Cost: ${formatPKR(client.package.purchasePrice)}` : 'Cost: N/A'}
//                           </p>
//                         </div>
//                       )}
//                     </div>

//                     {/* Price & Expiry */}
//                     <div className="grid grid-cols-2 gap-4 mb-3">
//                       <div>
//                         <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Price</p>
//                         <span className="font-bold text-emerald-600 dark:text-emerald-400">
//                           {formatPKR(client.price || 0)}
//                         </span>
//                       </div>
//                       <div>
//                         <p className="text-xs text-slate-500 dark:text-gray-400 mb-1">Expiry</p>
//                         <div className={`flex items-center gap-2 text-sm ${
//                           clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'
//                         }`}>
//                           <Calendar className={`w-4 h-4 ${clientExpired ? 'text-rose-500' : 'text-amber-500'}`} />
//                           <span className={clientExpired ? 'font-medium' : ''}>
//                             {formatDate(client.expiryDate)}
//                           </span>
//                         </div>
//                         {clientExpired && (
//                           <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full mt-1 inline-block">
//                             Expired
//                           </span>
//                         )}
//                       </div>
//                     </div>

//                     {/* Status & Actions */}
//                     <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-gray-700">
//                       <div className="flex flex-wrap gap-2">
//                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
//                           getPaymentStyles(client.paymentStatus || 'unknown')
//                         }`}>
//                           {client.paymentStatus || 'unknown'}
//                         </span>
//                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
//                           getStatusStyles(client.status || 'unknown', clientExpired)
//                         }`}>
//                           {clientExpired ? 'Expired' : client.status || 'unknown'}
//                         </span>
//                       </div>

//                       <div className="flex items-center gap-2 ml-auto">
//                         <Link
//                           href={`/dashboard/clients/${client.id}/edit`}
//                           className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
//                           title="Edit client"
//                         >
//                           <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
//                         </Link>
//                         <button
//                           onClick={() => setShowDeleteConfirm(client.id)}
//                           disabled={deletingId === client.id}
//                           className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn disabled:opacity-50"
//                           title="Delete client"
//                         >
//                           {deletingId === client.id ? (
//                             <RefreshCw className="w-4 h-4 animate-spin" />
//                           ) : (
//                             <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
//                           )}
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 )
//               })}
//             </div>
//           ) : (
//             <div className="p-8 text-center">
//               <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
//                 <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
//                   <User className="w-12 h-12 opacity-50" />
//                 </div>
//                 <div>
//                   <p className="font-semibold text-lg">No clients found</p>
//                   <p className="text-sm mt-1">
//                     {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
//                       ? 'Try adjusting your filters or search terms'
//                       : 'Get started by adding your first client'}
//                   </p>
//                 </div>
//                 {(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (
//                   <Link
//                     href="/dashboard/clients/new"
//                     className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
//                   >
//                     <Plus className="w-4 h-4" />
//                     Add Client
//                   </Link>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Table Content - Desktop View */}
//         <div className="hidden sm:block overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-slate-50/80 dark:bg-gray-900/50">
//               <tr className="text-left text-sm font-medium text-slate-500 dark:text-gray-400">
//                 <th className="px-4 sm:px-6 py-4">Client</th>
//                 <th className="px-4 sm:px-6 py-4">Contact</th>
//                 <th className="px-4 sm:px-6 py-4">
//                   <button
//                     onClick={() => {
//                       setSortBy('city')
//                       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
//                     }}
//                     className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
//                   >
//                     City
//                     <ArrowUpDown className="w-3 h-3" />
//                   </button>
//                 </th>
//                 <th className="px-4 sm:px-6 py-4">Area</th>
//                 <th className="px-4 sm:px-6 py-4">Package</th>
//                 <th className="px-4 sm:px-6 py-4">Service Provider</th>
//                 <th className="px-4 sm:px-6 py-4">
//                   <button
//                     onClick={() => {
//                       setSortBy('price')
//                       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
//                     }}
//                     className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
//                   >
//                     Price
//                     <ArrowUpDown className="w-3 h-3" />
//                   </button>
//                 </th>
//                 <th className="px-4 sm:px-6 py-4">
//                   <button
//                     onClick={() => {
//                       setSortBy('expiryDate')
//                       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
//                     }}
//                     className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
//                   >
//                     Expiry
//                     <ArrowUpDown className="w-3 h-3" />
//                   </button>
//                 </th>
//                 <th className="px-4 sm:px-6 py-4">Payment</th>
//                 <th className="px-4 sm:px-6 py-4">Status</th>
//                 <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
//               {currentClients.length > 0 ? (
//                 currentClients.map((client, index) => {
//                   const clientExpired = isExpired(client.expiryDate)
//                   return (
//                     <tr
//                       key={client.id}
//                       className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group"
//                       style={{ animationDelay: `${index * 50}ms` }}
//                     >
//                       {/* Client Info */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           {/* <div className="p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
//                             <User className="w-4 h-4 text-white" />
//                           </div> */}
//                           <div>
//                             <p className="text-sm text-slate-800 dark:text-white">{client.name}</p>
//                             <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                               <Hash className="w-3 h-3" />
//                               {client.cnic}
//                             </p>
//                           </div>
//                         </div>
//                       </td>

//                       {/* Contact */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="space-y-1">
//                           <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                             {/* <Phone className="w-3.5 h-3.5 text-blue-500" /> */}
//                             {client.phone}
//                           </div>
//                           {client.email && (
//                             <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
//                               {/* <Mail className="w-3 h-3" /> */}
//                               {client.email}
//                             </div>
//                           )}
//                         </div>
//                       </td>

//                       {/* City */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                           {/* <MapPin className="w-4 h-4 text-amber-500" /> */}
//                           {client.city}
//                         </div>
//                       </td>

//                       {/* Area */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
//                           {/* <MapPin className="w-4 h-4 text-blue-500" /> */}
//                           {client.area || '-'}
//                         </div>
//                       </td>

//                       {/* Package */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="space-y-1">
//                           <p className=" text-slate-800 dark:text-white text-sm">
//                             {client.package?.name || 'No Package'}
//                           </p>
//                           {client.package && (
//                             <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                               {/* <Wifi className="w-3 h-3" /> */}
//                               {client.package.speed} Mbps
//                             </p>
//                           )}
//                         </div>
//                       </td>

//                       {/* Service Provider */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="space-y-1">
//                           <p className="text-slate-800 dark:text-white text-sm">
//                             {client.package?.serviceProvider?.name || 'No Provider'}
//                           </p>
//                           {client.package?.serviceProvider && (
//                             <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
//                               {/* <Factory className="w-3 h-3" /> */}
//                               {client.package.purchasePrice ? `Cost: ${formatPKR(client.package.purchasePrice)}` : 'Cost: N/A'}
//                             </p>
//                           )}
//                         </div>
//                       </td>

//                       {/* Price */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
//                           {client.price || 0}
//                           {/* {formatPKR(client.price || 0)} */}
//                         </span>
//                       </td>

//                       {/* Expiry Date */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className={`flex items-center gap-2 text-sm ${
//                           clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-gray-200'
//                         }`}>
//                           {/* <Calendar className={`w-4 h-4 ${clientExpired ? 'text-rose-500' : 'text-amber-500'}`} /> */}
//                           <span className={clientExpired ? 'font-semibold' : ''}>
//                             {formatDate(client.expiryDate)}
//                           </span>
//                           {clientExpired && (
//                             <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
//                               Expired
//                             </span>
//                           )}
//                         </div>
//                       </td>

//                       {/* Payment Status */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
//                           getPaymentStyles(client.paymentStatus || 'unknown')
//                         }`}>
//                           {client.paymentStatus || 'unknown'}
//                         </span>
//                       </td>

//                       {/* Client Status */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
//                           getStatusStyles(client.status || 'unknown', clientExpired)
//                         }`}>
//                           {clientExpired ? 'Expired' : client.status || 'unknown'}
//                         </span>
//                       </td>

//                       {/* Actions */}
//                       <td className="px-4 sm:px-6 py-4">
//                         <div className="flex items-center justify-end gap-2">
//                           <Link
//                             href={`/dashboard/clients/${client.id}/edit`}
//                             className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors group/btn"
//                             title="Edit client"
//                           >
//                             <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
//                           </Link>
//                           <button
//                             onClick={() => setShowDeleteConfirm(client.id)}
//                             disabled={deletingId === client.id}
//                             className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors group/btn disabled:opacity-50"
//                             title="Delete client"
//                           >
//                             {deletingId === client.id ? (
//                               <RefreshCw className="w-4 h-4 animate-spin" />
//                             ) : (
//                               <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
//                             )}
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   )
//                 })
//               ) : (
//                 <tr>
//                   <td colSpan={10} className="px-4 sm:px-6 py-16 text-center">
//                     <div className="flex flex-col items-center gap-4 text-slate-400 dark:text-gray-500">
//                       <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full">
//                         <User className="w-12 h-12 opacity-50" />
//                       </div>
//                       <div>
//                         <p className="font-semibold text-lg">No clients found</p>
//                         <p className="text-sm mt-1">
//                           {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
//                             ? 'Try adjusting your filters or search terms'
//                             : 'Get started by adding your first client'}
//                         </p>
//                       </div>
//                       {(!searchTerm && filterStatus === 'all' && filterPayment === 'all') && (
//                         <Link
//                           href="/dashboard/clients/new"
//                           className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
//                         >
//                           <Plus className="w-4 h-4" />
//                           Add Client
//                         </Link>
//                       )}
//                     </div>
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination Controls */}
//         {totalPages > 1 && (
//           <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
//             <div className="text-sm text-slate-500 dark:text-gray-400">
//               Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length} clients
//             </div>
//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
//                 disabled={currentPage === 1}
//                 className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
//               >
//                 Previous
//               </button>

//               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
//                 let pageNum;
//                 if (totalPages <= 5) {
//                   // Show all pages if total is 5 or less
//                   pageNum = i + 1;
//                 } else if (currentPage <= 3) {
//                   // Show first 5 pages if current page is in the first 3
//                   pageNum = i + 1;
//                 } else if (currentPage >= totalPages - 2) {
//                   // Show last 5 pages if current page is in the last 3
//                   pageNum = totalPages - 4 + i;
//                 } else {
//                   // Show 2 before, current, 2 after
//                   pageNum = currentPage - 2 + i;
//                 }

//                 return (
//                   <button
//                     key={pageNum}
//                     onClick={() => setCurrentPage(pageNum)}
//                     className={`px-3 py-1.5 rounded-lg border transition-colors ${
//                       currentPage === pageNum
//                         ? 'bg-blue-600 text-white border-blue-600'
//                         : 'border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
//                     }`}
//                   >
//                     {pageNum}
//                   </button>
//                 );
//               })}

//               <button
//                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
//                 disabled={currentPage === totalPages}
//                 className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Table Footer */}
//         {filteredClients.length > 0 && (
//           <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30">
//             <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-gray-400">
//               <span>Showing {currentClients.length} of {filteredClients.length} clients</span>
//               <div className="flex flex-wrap items-center gap-4">
//                 <span>
//                   Total Revenue: <strong className="text-emerald-600 dark:text-emerald-400">
//                     {formatPKR(clients.reduce((sum, c) => sum + (c.price || 0), 0))}
//                   </strong>
//                 </span>
//                 <span className="flex items-center gap-1">
//                   <CheckCircle className="w-4 h-4 text-emerald-500" />
//                   {clients.filter(c => c.paymentStatus === 'paid').length} Paid
//                 </span>
//                 <span className="flex items-center gap-1">
//                   <AlertCircle className="w-4 h-4 text-rose-500" />
//                   {clients.filter(c => c.paymentStatus === 'unpaid').length} Unpaid
//                 </span>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

// /* ==================== SKELETON LOADING ==================== */

// function ClientsSkeleton() {
//   return (
//     <div className="space-y-6 animate-pulse">
//       {/* Header Skeleton */}
//       <div className="flex justify-between items-center">
//         <div className="space-y-2">
//           <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
//           <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
//         </div>
//         <div className="h-10 w-40 bg-slate-200 dark:bg-gray-700 rounded-xl" />
//       </div>

//       {/* Filters Skeleton */}
//       <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
//         <div className="flex flex-col lg:flex-row gap-4">
//           <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
//           <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
//           <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
//           <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
//         </div>
//       </div>

//       {/* Table Skeleton */}
//       <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
//         <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
//           <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
//         </div>
//         <div className="p-6 space-y-4">
//           {[1, 2, 3, 4, 5].map((row) => (
//             <div key={row} className="flex items-center gap-4">
//               <div className="flex items-center gap-3 flex-1">
//                 <div className="w-10 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
//                 <div className="space-y-2">
//                   <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
//                   <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
//                 </div>
//               </div>
//               <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
//               <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
//               <div className="h-4 w-28 bg-slate-100 dark:bg-gray-900 rounded" />
//               <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
//               <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
//               <div className="flex gap-2">
//                 <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
//                 <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }