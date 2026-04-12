'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Info
} from 'lucide-react';

export default function NewServiceProviderPage() {
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authCheck = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include'
        });

        if (authCheck.status === 401) {
          router.push('/login');
          return;
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/service-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          contactInfo,
          address,
          email,
          phone
        })
      });

      if (res.ok) {
        showNotification('success', 'Service provider created successfully!');
        setTimeout(() => {
          router.push('/dashboard/service-providers');
          router.refresh();
        }, 1500);
      } else if (res.status === 401) {
        router.push('/login');
      } else {
        const data = await res.json();
        showNotification('error', data.error || 'Failed to create service provider');
      }
    } catch (err) {
      showNotification('error', 'An error occurred while creating the service provider');
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
                Add New Provider
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Register a new internet service provider
            </p>
          </div>
        </div>
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
              <h2 className="font-semibold text-gray-900 dark:text-gray-50">Provider Information</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Enter the details for the new service provider
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
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100/60 dark:border-blue-700/40 rounded-xl">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300">What happens next?</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  After creating the provider, you&apos;ll be able to add internet packages and manage client subscriptions under this provider.
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
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Provider
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
