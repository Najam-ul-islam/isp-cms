'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText, CheckCircle, XCircle, AlertCircle, Building, User,
  Calendar, Clock, IndianRupee, RefreshCw, ArrowLeft
} from 'lucide-react'

interface QuotationItem {
  id: string
  name: string
  description: string | null
  amount: number
  quantity: number
}

interface QuotationData {
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
  company: {
    name: string
  }
  client: {
    name: string
    phone: string
    cnic: string
    city: string
  }
  items: QuotationItem[]
}

export default function PublicQuotationPage() {
  const params = useParams()
  const id = params.id as string

  const [quotation, setQuotation] = useState<QuotationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const res = await fetch(`/api/public/quotations/${id}`)

        if (!res.ok) {
          const error = await res.json()
          showNotification('error', error.message || 'Quotation not found')
          return
        }

        const data = await res.json()
        setQuotation(data)
      } catch (err) {
        console.error('Error fetching quotation:', err)
        showNotification('error', 'Failed to load quotation')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchQuotation()
    }
  }, [id])

  const handleAccept = async () => {
    if (!confirm('Are you sure you want to accept this quotation?')) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/public/quotations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to accept quotation')
        return
      }

      const data = await res.json()
      showNotification('success', 'Quotation accepted! An invoice has been created.')
      
      if (quotation) {
        setQuotation({
          ...quotation,
          status: 'accepted'
        })
      }
    } catch (err) {
      console.error('Error accepting quotation:', err)
      showNotification('error', 'Failed to accept quotation')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this quotation?')) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/public/quotations/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!res.ok) {
        const error = await res.json()
        showNotification('error', error.message || 'Failed to reject quotation')
        return
      }

      showNotification('info', 'Quotation rejected')
      
      if (quotation) {
        setQuotation({
          ...quotation,
          status: 'rejected'
        })
      }
    } catch (err) {
      console.error('Error rejecting quotation:', err)
      showNotification('error', 'Failed to reject quotation')
    } finally {
      setProcessing(false)
    }
  }

  const formatPKR = (amount: number) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount)

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  const isExpired = (validUntil: Date | null) => {
    if (!validUntil) return false
    return new Date() > new Date(validUntil)
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'accepted': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'expired': return 'bg-gray-100 text-gray-600 border-gray-200'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading quotation...</p>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Quotation Not Found</h1>
          <p className="text-gray-600">The quotation you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  const expired = isExpired(quotation.validUntil)

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in
          ${notification.type === 'success' ? 'bg-emerald-500 text-white' : ''}
          ${notification.type === 'error' ? 'bg-rose-500 text-white' : ''}
          ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}`}>
          {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h1 className="text-2xl font-bold">{quotation.quotationNumber}</h1>
                <p className="text-blue-100 text-sm mt-1">{quotation.company.name}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusStyles(quotation.status)}`}>
                {expired ? 'Expired' : quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Company</p>
                  <p className="text-sm font-semibold text-gray-900">{quotation.company.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="text-sm font-semibold text-gray-900">{quotation.client.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valid Until</p>
                  <p className={`text-sm font-semibold ${expired ? 'text-rose-600' : 'text-gray-900'}`}>
                    {formatDate(quotation.validUntil)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-lg font-bold text-emerald-600">{formatPKR(quotation.totalAmount)}</p>
                </div>
              </div>
            </div>

            {quotation.title && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Title</h3>
                <p className="text-gray-900">{quotation.title}</p>
              </div>
            )}

            {quotation.description && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{quotation.description}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {quotation.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{formatPKR(item.amount)}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatPKR(item.amount * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Amount</td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-emerald-600">{formatPKR(quotation.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {quotation.status === 'sent' && !expired && (
              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Accept Quotation
                    </>
                  )}
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" /> Reject Quotation
                    </>
                  )}
                </button>
              </div>
            )}

            {quotation.status === 'accepted' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">This quotation has been accepted</span>
              </div>
            )}

            {quotation.status === 'rejected' && (
              <div className="flex items-center justify-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">This quotation has been rejected</span>
              </div>
            )}

            {expired && (
              <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-medium">This quotation has expired and cannot be accepted</span>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                Created on {formatDate(quotation.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}