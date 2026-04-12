'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ServiceProvider } from '@prisma/client';
import {
  Factory,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Info,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function EditServiceProviderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchServiceProvider = async () => {
      try {
        const res = await fetch(`/api/service-providers/${id}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch service provider');
        }

        const data: ServiceProvider = await res.json();
        setServiceProvider(data);

        setName(data.name);
        setContactInfo(data.contactInfo || '');
        setAddress(data.address || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setIsActive(data.isActive);
      } catch (err) {
        console.error('Error fetching service provider:', err);
        setNotification({ type: 'error', message: 'Failed to load service provider' });
      } finally {
        setLoading(false);
      }
    };

    fetchServiceProvider();
  }, [id, router]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/service-providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          contactInfo,
          address,
          email,
          phone,
          isActive
        })
      });

      if (res.ok) {
        showNotification('success', 'Service provider updated successfully!');
        setTimeout(() => {
          router.push('/dashboard/service-providers');
          router.refresh();
        }, 1500);
      } else {
        const data = await res.json();
        showNotification('error', data.error || 'Failed to update service provider');
      }
    } catch (err) {
      showNotification('error', 'An error occurred while updating the service provider');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Toast */}
      {notification && (
        <div className={`
          fixed top-4 right-4 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3
          animate-slide-in backdrop-blur-xl border
          ${notification.type === 'success' ? 'bg-emerald-500/95 border-emerald-400/60 text-white' : ''}
          ${notification.type === 'error' ? 'bg-red-500/95 border-red-400/60 text-white' : ''}
          ${notification.type === 'info' ? 'bg-blue-500/95 border-blue-400/60 text-white' : ''}
        `} role="alert" aria-live="polite">
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {notification.type === 'info' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="font-medium text-sm">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-1 hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50">
                Edit Provider
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Update the service provider details
            </p>
          </div>
        </div>
        {serviceProvider && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
            serviceProvider.isActive
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serviceProvider.isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'}`}></span>
            {serviceProvider.isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden
                      transition-all duration-300 ease-out">
        {/* Form Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
              <Factory className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">Provider Details</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Modify the information for this service provider
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="name">
                Provider Name <span className="text-red-500" aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., PTCL, WorldCall, Telenor"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                             transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  required
                  autoComplete="organization"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                             transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="phone">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 123 4567890"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                             transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="address">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address of the service provider"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                             transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  autoComplete="street-address"
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="contactInfo">
                Additional Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <textarea
                  id="contactInfo"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Any additional contact information, notes, etc."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                             transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none"
                />
              </div>
            </div>

            {/* Status Toggle */}
            <div className="md:col-span-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/30'
                        : 'bg-red-50 dark:bg-red-900/30'
                    }`}>
                      {isActive ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Provider Status</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {isActive ? 'This provider is currently active and accepting clients' : 'This provider is currently inactive'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={isActive}
                    aria-label="Toggle provider status"
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100/60 dark:border-blue-700/40 rounded-xl">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Note</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Changes will be applied immediately. Deactivating a provider will not affect existing clients but may prevent new subscriptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-hidden="true"></span>
              Required field
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                           border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                           hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300/60 dark:hover:border-gray-600/60
                           transition-all duration-200 font-medium text-sm disabled:opacity-50
                           focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-500 dark:bg-blue-600 text-white font-semibold rounded-xl
                           border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                           hover:bg-blue-600 dark:hover:bg-blue-500
                           hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
                           transition-all duration-200 ease-out hover:-translate-y-0.5
                           disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Update Provider
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
