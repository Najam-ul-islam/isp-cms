'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Package, ServiceProvider, ClientStatus, PaymentStatus } from '@prisma/client';
import {
  ArrowLeft,
  User,
  AtSign,
  Phone,
  CreditCard,
  Building,
  MapPin,
  Globe,
  Wifi,
  DollarSign,
  Calendar,
  FileText,
  CreditCard as PaymentIcon,
  Activity,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Save,
  Clock,
  ChevronDown,
  Plus,
  RefreshCw
} from 'lucide-react';

interface Area {
  id: string
  name: string
  description: string | null
  _count: {
    clients: number
  }
}

interface ClientWithPackage extends Client {
  package: Package & {
    serviceProvider?: ServiceProvider | null;
  };
}

export default function EditClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [client, setClient] = useState<ClientWithPackage | null>(null);
  const [packages, setPackages] = useState<(Package & { serviceProvider?: ServiceProvider | null })[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [city, setCity] = useState('');
  const [areaId, setAreaId] = useState('');
  const [country, setCountry] = useState('');
  const [packageId, setPackageId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [status, setStatus] = useState<ClientStatus>('active');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch client data
        const clientRes = await fetch(`/api/clients/${id}`, {
          credentials: 'include'
        });

        if (!clientRes.ok) {
          if (clientRes.status === 401) {
            router.push('/login');
            return;
          }
          setError('Failed to fetch client data');
          return;
        }

        const clientData: ClientWithPackage = await clientRes.json();

        // Set form fields with client data, with null checks and proper date handling
        setName(clientData.name || '');
        setUsername(clientData.username || '');
        setPhone(clientData.phone || '');
        setCnic(clientData.cnic || '');
        setCity(clientData.city || '');
        setAreaId(clientData.areaId || '');
        setCountry(clientData.country || '');
        setPackageId(clientData.packageId || '');
        setPrice(clientData.price || 0);

        // Handle dates - they come as Date objects from Prisma but may need proper formatting
        let startDateStr = '';
        if (clientData.startDate) {
          const startDateObj = new Date(clientData.startDate);
          if (!isNaN(startDateObj.getTime())) {
            startDateStr = startDateObj.toISOString().split('T')[0];
          }
        }
        setStartDate(startDateStr);

        let expiryDateStr = '';
        if (clientData.expiryDate) {
          const expiryDateObj = new Date(clientData.expiryDate);
          if (!isNaN(expiryDateObj.getTime())) {
            expiryDateStr = expiryDateObj.toISOString().split('T')[0];
          }
        }
        setExpiryDate(expiryDateStr);

        setPaymentStatus(clientData.paymentStatus || 'unpaid');
        setStatus(clientData.status || 'active');
        setNotes(clientData.notes || '');

        setClient(clientData);

        // Fetch all packages with service provider info and areas
        const [packagesRes, areasRes] = await Promise.all([
          fetch('/api/packages', {
            credentials: 'include'
          }),
          fetch('/api/areas', {
            credentials: 'include'
          })
        ]);

        if (!packagesRes.ok) {
          if (packagesRes.status === 401) {
            router.push('/login');
            return;
          }
          setError('Failed to fetch packages');
          return;
        }

        if (areasRes.ok) {
          const areasData = await areasRes.json()
          setAreas(areasData)
        }

        const packagesData = await packagesRes.json();
        setPackages(packagesData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!startDate || !expiryDate) {
      setNotification({ type: 'error', message: 'Start date and expiry date are required' });
      return;
    }
    const start = new Date(startDate);
    const expiry = new Date(expiryDate);
    if (expiry <= start) {
      setNotification({ type: 'error', message: 'Expiry date must be after start date' });
      return;
    }
    if (!price || price <= 0) {
      setNotification({ type: 'error', message: 'Price must be greater than 0' });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          username: username || undefined,
          phone,
          cnic,
          city,
          areaId: areaId || undefined,
          country,
          packageId,
          price: typeof price === 'string' ? parseFloat(price) : price,
          startDate,
          expiryDate,
          paymentStatus,
          status,
          notes: notes || null
        })
      });

      if (res.ok) {
        setNotification({ type: 'success', message: 'Client updated successfully' });
        setTimeout(() => {
          router.push('/dashboard/clients');
        }, 1500);
      } else {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || 'Failed to update client' });
      }
    } catch (err) {
      console.error('Error updating client:', err);
      setNotification({ type: 'error', message: 'An error occurred while updating the client' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddArea = async () => {
    if (!newAreaName.trim()) {
      setNotification({ type: 'error', message: 'Please enter an area name' });
      return;
    }

    setLoadingAreas(true);
    try {
      const res = await fetch('/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newAreaName.trim() })
      });

      if (res.ok) {
        const newArea = await res.json();
        setAreas(prev => [...prev, newArea]);
        setAreaId(newArea.id);
        setNewAreaName('');
        setShowAddArea(false);
        setNotification({ type: 'success', message: `Area "${newArea.name}" created successfully!` });
      } else {
        const data = await res.json();
        setNotification({ type: 'error', message: data.error || 'Failed to create area' });
      }
    } catch (err) {
      console.error('Error creating area:', err);
      setNotification({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoadingAreas(false);
    }
  };

  // Format PKR currency
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge styles
  const getStatusBadgeStyles = (value: string) => {
    const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border';
    switch (value) {
      case 'active':
        return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800`;
      case 'expired':
        return `${base} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800`;
      case 'suspended':
        return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`;
      default:
        return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600`;
    }
  };

  // Get payment status badge styles
  const getPaymentBadgeStyles = (value: string) => {
    const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';
    switch (value) {
      case 'paid':
        return `${base} bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300`;
      case 'unpaid':
        return `${base} bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300`;
      case 'partial':
        return `${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`;
      default:
        return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400`;
    }
  };

  if (loading) {
    return <EditClientSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 dark:text-rose-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-200 mb-2">Error Loading Data</h3>
          <p className="text-rose-600 dark:text-rose-300 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`
            fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3
            animate-slide-in backdrop-blur-xl border
            ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : ''}
            ${notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : ''}
          `}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors group"
            title="Go back"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
              Edit Client
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
              Update client information and settings
            </p>
          </div>
        </div>

        {/* Status Badges */}
        {client && (
          <div className="flex items-center gap-2">
            <span className={getStatusBadgeStyles(client.status)}>
              <Activity className="w-3.5 h-3.5" />
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </span>
            <span className={getPaymentBadgeStyles(client.paymentStatus)}>
              <PaymentIcon className="w-3.5 h-3.5" />
              {client.paymentStatus.charAt(0).toUpperCase() + client.paymentStatus.slice(1)}
            </span>
          </div>
        )}
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Client Details</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Modify the client information below
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Personal Information Section */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Personal Information
              </h3>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="name">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter client's full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="username">
                    Username <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(Optional, must be unique)</span>
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter unique username"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="phone">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 3XX XXXXXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* CNIC */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="cnic">
                    CNIC <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="cnic"
                      type="text"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="XXXXX-XXXXXXX-X"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Location
              </h3>
              <div className="space-y-4">
                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="city">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter city"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Area Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="area">
                    Area <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  {showAddArea ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                          <input
                            id="newAreaName"
                            type="text"
                            value={newAreaName}
                            onChange={(e) => setNewAreaName(e.target.value)}
                            placeholder="Enter area name"
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddArea()
                              }
                              if (e.key === 'Escape') {
                                setShowAddArea(false)
                                setNewAreaName('')
                              }
                            }}
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddArea}
                          disabled={loadingAreas}
                          className="px-4 py-2.5 bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                        >
                          {loadingAreas ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddArea(false)
                            setNewAreaName('')
                          }}
                          className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <select
                          id="area"
                          value={areaId}
                          onChange={(e) => setAreaId(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 appearance-none cursor-pointer"
                        >
                          <option value="">Select Area</option>
                          {areas.length === 0 ? (
                            <option value="" disabled>No areas found</option>
                          ) : (
                            areas.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} {a.description ? `(${a.description})` : ''} - {a._count.clients} client(s)
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddArea(true)}
                        className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all flex items-center justify-center gap-2 border border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-600"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Area
                      </button>
                    </div>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="country">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Enter country"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Package & Billing Section */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-purple-500" />
                Package & Billing
              </h3>
              <div className="space-y-4">
                {/* Package Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="package">
                    Select Package <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <select
                      id="package"
                      value={packageId}
                      onChange={(e) => setPackageId(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Choose a package...</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.speed} Mbps - {formatPKR(pkg.price)} {pkg.serviceProvider ? `(${pkg.serviceProvider.name})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="price">
                    Price (PKR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="startDate">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="expiryDate">
                    Expiry Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Notes Section (Full Width) */}
            <div className="lg:col-span-2 xl:col-span-3 space-y-5">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Status & Notes
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="paymentStatus">
                    Payment Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <PaymentIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <select
                      id="paymentStatus"
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 appearance-none cursor-pointer"
                      required
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="status">
                    Client Status <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ClientStatus)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 appearance-none cursor-pointer"
                      required
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="suspended">Suspended</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Notes */}
                <div className="lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5" htmlFor="notes">
                    Notes
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={1}
                      placeholder="Add notes about this client..."
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 border border-gray-200 dark:border-gray-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm min-w-[140px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Client
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function EditClientSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-gray-200 dark:bg-gray-700 rounded-xl w-10 h-10" />
        <div className="space-y-2">
          <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>

      {/* Form Card Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        {/* Form Header Skeleton */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg w-9 h-9" />
            <div className="space-y-2">
              <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-44 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Column 1 Skeleton */}
            <div className="space-y-5">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2 Skeleton */}
            <div className="space-y-5">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3 Skeleton */}
            <div className="space-y-5">
              <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>

            {/* Full Width Row Skeleton */}
            <div className="lg:col-span-2 xl:col-span-3 space-y-5">
              <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className={`bg-gray-200 dark:bg-gray-700 rounded-xl ${i === 3 ? 'h-10' : 'h-10'}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-10 w-36 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
