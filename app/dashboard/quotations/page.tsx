'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText, Plus, Search, ChevronDown, CheckCircle, AlertCircle, X,
  RefreshCw, Send, Trash2, Eye, IndianRupee, Calendar, User, Building, Clock
} from 'lucide-react'

interface QuotationItem {
  id: string
  name: string
  description: string | null
  amount: number
  quantity: number
}

interface Quotation {
  id: string
  quotationNumber: string
  title: string | null
  description: string | null
  totalAmount: number
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired'
  validUntil: Date | null
  sentAt: Date | null
  respondedAt: Date | null
  createdAt: Date
  client: {
    id: string
    name: string
    phone: string
    cnic: string
  }
  items: QuotationItem[]
  invoice?: {
    id: string
    status: string
  } | null
}

interface Client {
  id: string
  name: string
  phone: string
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const router = useRouter()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newQuotation, setNewQuotation] = useState({
    clientId: '',
    title: '',
    description: '',
    validUntil: '',
    items: [{ name: '', amount: 0, quantity: 1 }]
  })

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const isMounted = useRef(false)
  const hasFetched = useRef(false)

  const fetchQuotations = useCallback(async (signal: AbortSignal) => {
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      
      const res = await fetch(`/api/quotations?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        signal
      })

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
        } else {
          showNotification('error', 'Failed to fetch quotations')
        }
        return
      }

      const data: Quotation[] = await res.json()
      
      if (isMounted.current) {
        setQuotations(data)
        setLoading(false)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching quotations:', err)
        showNotification('error', 'Network error. Please try again.')
        if (isMounted.current) {
          router.push('/login')
          setLoading(false)
        }
      }
    }
  }, [router, filterStatus])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients', {
        credentials: 'include',
        cache: 'no-store'
      })

      if (res.ok) {
        const data = await res.json()
        setClients(data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })))
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    isMounted.current = true
    const controller = new AbortController()

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

        await fetchQuotations(controller.signal)
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

    return () => {
      isMounted.current = false
      hasFetched.current = false
      controller.abort()
    }
  }, [router, fetchQuotations])

  useEffect(() => {
    if (!loading) {
      const controller = new AbortController()
      fetchQuotations(controller.signal)
    }
  }, [filterStatus])

  const handleCreateQuotation = async () => {
    if (!newQuotation.clientId) {
      showNotification('error', 'Please select a client')
      return
    }

    const validItems = newQuotation.items.filter(i => i.name && i.amount > 0)
    if (validItems.length === 0) {
      showNotification('error', 'Please add at least one valid item')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newQuotation)
      })

      if (res.ok) {
        showNotification('success', 'Quotation created successfully')
        setShowCreateModal(false)
        setNewQuotation({
          clientId: '',
          title: '',
          description: '',
          validUntil: '',
          items: [{ name: '', amount: 0, quantity: 1 }]
        })
        const controller = new AbortController()
        fetchQuotations(controller.signal)
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to create quotation')
      }
    } catch (err) {
      console.error('Error creating quotation:', err)
      showNotification('error', 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleSendQuotation = async (id: string) => {
    if (!confirm('Are you sure you want to send this quotation?')) return

    setActionLoading(id)
    try {
      const res = await fetch(`/api/quotations/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (res.ok) {
        showNotification('success', 'Quotation sent successfully')
        const controller = new AbortController()
        fetchQuotations(controller.signal)
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to send quotation')
      }
    } catch (err) {
      console.error('Error sending quotation:', err)
      showNotification('error', 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteQuotation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return

    setActionLoading(id)
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      if (res.ok) {
        showNotification('success', 'Quotation deleted successfully')
        setQuotations(quotations.filter(q => q.id !== id))
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to delete quotation')
      }
    } catch (err) {
      console.error('Error deleting quotation:', err)
      showNotification('error', 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = !searchTerm || 
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.title && q.title.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentQuotations = filteredQuotations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage)

  const formatPKR = (amount: number) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount)

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      case 'sent': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'accepted': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      case 'rejected': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      case 'expired': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }
  }

  const addItem = () => {
    setNewQuotation({
      ...newQuotation,
      items: [...newQuotation.items, { name: '', amount: 0, quantity: 1 }]
    })
  }

  const removeItem = (index: number) => {
    if (newQuotation.items.length === 1) return
    setNewQuotation({
      ...newQuotation,
      items: newQuotation.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const items = [...newQuotation.items]
    items[index] = { ...items[index], [field]: value }
    setNewQuotation({ ...newQuotation, items })
  }

  const calculateTotal = () => {
    return newQuotation.items.reduce((sum, item) => sum + (item.amount * item.quantity || 0), 0)
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 dark:bg-gray-900 rounded-lg" />
            <div className="space-y-1.5">
              <div className="h-5 w-28 bg-gray-100 dark:bg-gray-900 rounded" />
              <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800 rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-gray-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-12">
        <div className="animate-pulse flex items-center justify-center h-32">
          <div className="text-gray-400 dark:text-gray-500">Loading quotations...</div>
        </div>
      </div>
    </div>
  )

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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-linear-to-r from-gray-50/50 to-white dark:from-gray-900/30 dark:to-gray-800/50 rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Quotation</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[calc(100vh-12rem)] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                  <select
                    value={newQuotation.clientId}
                    onChange={(e) => setNewQuotation({ ...newQuotation, clientId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name} ({client.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={newQuotation.title}
                    onChange={(e) => setNewQuotation({ ...newQuotation, title: e.target.value })}
                    placeholder="e.g., Internet Package Quote"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={newQuotation.description}
                    onChange={(e) => setNewQuotation({ ...newQuotation, description: e.target.value })}
                    placeholder="Additional details..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={newQuotation.validUntil}
                    onChange={(e) => setNewQuotation({ ...newQuotation, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Items *</label>
                    <button onClick={addItem} type="button" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add Item</button>
                  </div>
                  <div className="space-y-2">
                    {newQuotation.items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          placeholder="Item name"
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          placeholder="Qty"
                          min={1}
                          className="w-20 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="Amount"
                          min={0}
                          className="w-28 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                        />
                        {newQuotation.items.length > 1 && (
                          <button onClick={() => removeItem(index)} type="button" className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuotation}
                  disabled={creating}
                  className="px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Quotation</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-linear-to-r from-gray-50/50 to-white dark:from-gray-900/30 dark:to-gray-800/50 rounded-t-2xl">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedQuotation.quotationNumber}</h2>
                {selectedQuotation.title && <p className="text-sm text-gray-500 dark:text-gray-400">{selectedQuotation.title}</p>}
              </div>
              <button onClick={() => setShowViewModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedQuotation.client.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusStyles(selectedQuotation.status)}`}>
                      {selectedQuotation.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Valid Until</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedQuotation.validUntil)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(selectedQuotation.totalAmount)}</p>
                  </div>
                </div>
              </div>

              {selectedQuotation.description && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedQuotation.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</p>
                <div className="border border-gray-200/60 dark:border-gray-700/60 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Item</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                      {selectedQuotation.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{formatPKR(item.amount)}</td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-medium">{formatPKR(item.amount * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedQuotation.invoice && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Invoice Created</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                {selectedQuotation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => { handleSendQuotation(selectedQuotation.id); setShowViewModal(false) }}
                      disabled={actionLoading === selectedQuotation.id}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Send Quotation
                    </button>
                    <button
                      onClick={() => { handleDeleteQuotation(selectedQuotation.id); setShowViewModal(false) }}
                      disabled={actionLoading === selectedQuotation.id}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </>
                )}
                {selectedQuotation.status === 'sent' && (
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Quotations</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{filteredQuotations.length} quotation{filteredQuotations.length !== 1 ? 's' : ''} found</p>
            </div>
          </div>
          <button
            onClick={() => { fetchClients(); setShowCreateModal(true) }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-sm"
          >
            <Plus className="w-4 h-4" /> Create Quotation
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by number, client, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-linear-to-r from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Number</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Client</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Title</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Valid Until</th>
                <th className="px-3 py-3 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {currentQuotations.length > 0 ? (
                currentQuotations.map((quotation, index) => (
                  <tr key={quotation.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{indexOfFirstItem + index + 1}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{quotation.quotationNumber}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-xs text-gray-900 dark:text-white font-medium">{quotation.client.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{quotation.client.phone}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-37.5">{quotation.title || '-'}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(quotation.totalAmount)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusStyles(quotation.status)}`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{formatDate(quotation.validUntil)}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setSelectedQuotation(quotation); setShowViewModal(true) }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {quotation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleSendQuotation(quotation.id)}
                              disabled={actionLoading === quotation.id}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                              title="Send Quotation"
                            >
                              {actionLoading === quotation.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteQuotation(quotation.id)}
                              disabled={actionLoading === quotation.id}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors disabled:opacity-50"
                              title="Delete Quotation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                      <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <FileText className="w-10 h-10 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold">No quotations found</p>
                        <p className="text-xs mt-0.5">{searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create your first quotation'}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredQuotations.length)} of {filteredQuotations.length}</div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs">Previous</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) pageNum = i + 1
                else if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = currentPage - 2 + i
                return (<button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-2.5 py-1 rounded border transition-colors text-xs ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{pageNum}</button>)
              })}
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}