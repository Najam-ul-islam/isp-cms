'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Package, ServiceProvider } from '@prisma/client'
import {
  User,
  Phone,
  CreditCard,
  MapPin,
  Globe,
  Wifi,
  Calendar,
  Clock,
  IndianRupee,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Hash,
  Building,
  Factory
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function NewClientPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cnic, setCnic] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [country, setCountry] = useState('')
  const [packageId, setPackageId] = useState('')
  const [price, setPrice] = useState(0)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [expiryDate, setExpiryDate] = useState<Date | null>(null)
  const [hasUserManuallySetExpiry, setHasUserManuallySetExpiry] = useState(false)

  // Helper function to calculate default expiry date (30 days from start date)
  const calculateDefaultExpiry = (start: Date | null, durationDays: number | undefined = undefined) => {
    if (!start) return null;

    const calculatedExpiry = new Date(start);

    // Use package duration if available, otherwise default to 30 days
    const daysToAdd = durationDays !== undefined ? durationDays : 30;
    calculatedExpiry.setDate(calculatedExpiry.getDate() + daysToAdd);

    return calculatedExpiry;
  };
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid')
  const [status, setStatus] = useState<'active' | 'expired' | 'suspended'>('active')
  const [notes, setNotes] = useState('')
  const [packages, setPackages] = useState<(Package & { serviceProvider?: ServiceProvider | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
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
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [router])

  // Auto-fill price when package is selected
  useEffect(() => {
    if (packageId) {
      const pkg = packages.find(p => p.id === packageId)
      if (pkg) {
        setSelectedPackage(pkg)
        setPrice(pkg.price)
        // Auto-calculate expiry if start date is set and expiry hasn't been manually set
        if (startDate && !hasUserManuallySetExpiry) {
          const calculatedExpiry = calculateDefaultExpiry(startDate, pkg.durationDays);
          if (calculatedExpiry) {
            setExpiryDate(calculatedExpiry);
          }
        }
      }
    }
  }, [packageId, packages, startDate, hasUserManuallySetExpiry])

  // Auto-calculate expiry when start date or package changes
  useEffect(() => {
    if (startDate && !hasUserManuallySetExpiry) {
      // Calculate default expiry based on package duration or default to 30 days
      const calculatedExpiry = calculateDefaultExpiry(startDate, selectedPackage?.durationDays);

      // Only auto-set if expiry is not manually set by the user
      if (calculatedExpiry) {
        setExpiryDate(calculatedExpiry);
      }
    }
  }, [startDate, selectedPackage, hasUserManuallySetExpiry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          phone,
          cnic,
          city,
          area,
          country,
          packageId,
          price: parseFloat(price.toString()),
          startDate: startDate ? new Date(startDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          paymentStatus,
          status,
          notes
        })
      })

      if (res.ok) {
        showNotification('success', 'Client created successfully!')
        setTimeout(() => {
          router.push('/dashboard/clients')
          router.refresh()
        }, 1500)
      } else {
        const data = await res.json()
        showNotification('error', data.error || 'Failed to create client')
      }
    } catch (err) {
      showNotification('error', 'An error occurred while creating the client')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Format PKR currency
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Get badge styles for status
  const getStatusBadgeStyles = (value: string, isPayment = false) => {
    const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border'
    if (isPayment) {
      switch (value) {
        case 'paid': return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800`
        case 'unpaid': return `${base} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800`
        case 'partial': return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`
        default: return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600`
      }
    }
    switch (value) {
      case 'active': return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800`
      case 'expired': return `${base} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800`
      case 'suspended': return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`
      default: return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600`
    }
  }

  if (loading) {
    return <NewClientSkeleton />
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors" />
          </button>
          <div>
            <h1 className="text-2xl text-slate-800 lg:text-3xl font-bold  dark:text-slate-800">
                Add New Client
              </h1>
            <p className="text-slate-500 dark:text-gray-400 mt-1">
              Register a new internet service subscriber
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 bg-linear-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Client Information</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Fill in the details below to register a new client
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information Section */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="name">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter client's full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="phone">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 3XX XXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* CNIC */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="cnic">
                    CNIC <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="cnic"
                      type="text"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="city">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter city"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="area">
                    Area
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="area"
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Enter area"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="country">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Enter country"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Package & Pricing Section */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-purple-500" />
                Package & Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Package Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="package">
                    Select Package <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="package"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Choose a package...</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.speed} Mbps - {formatPKR(pkg.price)} {pkg.serviceProvider ? `(${pkg.serviceProvider.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {selectedPackage && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <Sparkles className="w-4 h-4" />
                        <span>
                          <strong>{selectedPackage.name}</strong>: {selectedPackage.speed} Mbps, {selectedPackage.durationDays} days validity
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="price">
                    Price (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    {/* <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" /> */}
                    <input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => {
                        setStartDate(date);
                        // Only auto-set expiry date if it hasn't been manually set by the user
                        if (date && !hasUserManuallySetExpiry) {
                          const calculatedExpiry = calculateDefaultExpiry(date, selectedPackage?.durationDays);
                          if (calculatedExpiry) {
                            setExpiryDate(calculatedExpiry);
                          }
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                      placeholderText="Select start date"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                    <DatePicker
                      selected={expiryDate}
                      onChange={(date: Date | null) => {
                        setExpiryDate(date);
                        // Mark that the user has manually set the expiry date
                        setHasUserManuallySetExpiry(true);
                      }}
                      className="w-full pl-10 pr-16 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white"
                      placeholderText="Select expiry date"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (startDate) {
                          const calculatedExpiry = calculateDefaultExpiry(startDate, selectedPackage?.durationDays);
                          if (calculatedExpiry) {
                            setExpiryDate(calculatedExpiry);
                            // Reset the manual flag since we're reverting to calculated date
                            setHasUserManuallySetExpiry(false);
                          }
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                      title="Reset to default expiry date"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Section */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Status Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="paymentStatus">
                    Payment Status
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="paymentStatus"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Client Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="status">
                    Client Status
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2" htmlFor="notes">
                <FileText className="w-4 h-4 inline mr-1" />
                Additional Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional information about this client..."
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Required field
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Client
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// Add ChevronDown import helper since it's used but not imported
function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/* ==================== SKELETON LOADING ==================== */

function NewClientSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-lg" />
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-gray-700 rounded-lg" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Section Headers */}
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-4">
              <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((field) => (
                  <div key={field} className={field === 3 ? 'md:col-span-2' : ''}>
                    <div className="h-4 w-24 bg-slate-100 dark:bg-gray-800 rounded mb-2" />
                    <div className="h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Notes */}
          <div>
            <div className="h-4 w-28 bg-slate-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-24 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/30 flex justify-end gap-3">
          <div className="w-24 h-10 bg-slate-200 dark:bg-gray-700 rounded-xl" />
          <div className="w-32 h-10 bg-slate-300 dark:bg-gray-600 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
