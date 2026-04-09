'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ServiceProvider as SPType } from '@prisma/client';
import {
  Factory,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  ChevronDown,
  Package,
  Activity
} from 'lucide-react';

interface ExtendedServiceProvider extends SPType {
  _count?: {
    packages: number;
  };
}

export default function ServiceProvidersPage() {
  const [serviceProviders, setServiceProviders] = useState<ExtendedServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const router = useRouter();

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    // Check if user is authenticated by making a simple API call
    const checkAuth = async () => {
      try {
        const authCheck = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include' // This ensures cookies are sent with the request
        });

        if (authCheck.status === 401) {
          router.push('/login');
          return;
        }

        const fetchServiceProviders = async () => {
          try {
            const res = await fetch('/api/service-providers', {
              credentials: 'include', // This ensures cookies are sent with the request
              headers: {
                'Content-Type': 'application/json'
              },
              cache: 'no-store'
            });

            if (res.ok) {
              const data = await res.json();
              setServiceProviders(data);
            } else if (res.status === 401) {
              router.push('/login');
            } else {
              showNotification('error', 'Failed to fetch service providers');
            }
          } catch (err) {
            console.error('Error fetching service providers:', err);
            showNotification('error', 'Network error. Please try again.');
          } finally {
            setLoading(false);
          }
        };

        fetchServiceProviders();
      } catch (err) {
        console.error('Error during auth check:', err);
        showNotification('error', 'Authentication error. Please try again.');
      }
    };

    checkAuth();
  }, [router]);

  const handleDelete = async (id: string) => {
    // Check if user is authenticated by making a simple API call
    const authCheck = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include' // This ensures cookies are sent with the request
    });

    if (authCheck.status === 401) {
      router.push('/login');
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/service-providers/${id}`, {
        method: 'DELETE',
        credentials: 'include', // This ensures cookies are sent with the request
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        setServiceProviders(serviceProviders.filter(sp => sp.id !== id));
        showNotification('success', 'Service provider deleted successfully');
        setShowDeleteConfirm(null);
      } else {
        const error = await res.json();
        showNotification('error', error.message || 'Failed to delete service provider');
      }
    } catch (err) {
      console.error('Error deleting service provider:', err);
      showNotification('error', 'An error occurred while deleting');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter service providers
  const filteredServiceProviders = serviceProviders
    .filter(sp => {
      const matchesSearch = sp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'active' && sp.isActive) ||
                           (filterStatus === 'inactive' && !sp.isActive);
      return matchesSearch && matchesStatus;
    });

  if (loading) {
    return <ServiceProvidersSkeleton />;
  }

  const activeCount = serviceProviders.filter(sp => sp.isActive).length;

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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Service Provider?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this service provider? All associated packages will need to be reassigned.
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
          <h1 className="text-2xl lg:text-3xl font-bold bg-linear-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Service Provider Management
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">
            Manage internet service providers and their packages
          </p>
        </div>
        <Link
          href="/dashboard/service-providers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Add Provider
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Total Providers</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{serviceProviders.length}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Factory className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Active Providers</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-slate-200/60 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Total Packages</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {serviceProviders.reduce((sum, sp) => sum + (sp._count?.packages || 0), 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by provider name..."
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
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Service Providers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-gray-700 overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Factory className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">All Service Providers</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {filteredServiceProviders.length} provider{filteredServiceProviders.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 animate-pulse space-y-4">
            <div className="h-12 bg-slate-100 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-slate-100 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-slate-100 dark:bg-gray-700 rounded"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400">Provider</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400">Contact Info</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400">Packages</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                {filteredServiceProviders.length > 0 ? (
                  filteredServiceProviders.map((sp, index) => (
                    <tr key={sp.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-700/30 transition-colors group" style={{ animationDelay: `${index * 50}ms` }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-purple-500/20">
                            {sp.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 dark:text-white">{sp.name}</div>
                            <div className="text-xs text-slate-500 dark:text-gray-400">ID: {sp.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {sp.email && (
                            <p className="text-sm text-slate-600 dark:text-gray-300">{sp.email}</p>
                          )}
                          {sp.phone && (
                            <p className="text-sm text-slate-600 dark:text-gray-300">{sp.phone}</p>
                          )}
                          {!sp.email && !sp.phone && (
                            <span className="text-sm text-slate-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-gray-300">
                        {new Date(sp.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/service-providers/${sp.id}/packages`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            (sp._count?.packages || 0) > 0
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                              : 'bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-gray-400'
                          }`}
                        >
                          <Package className="w-3 h-3" />
                          {sp._count?.packages || 0} package{(sp._count?.packages || 0) !== 1 ? 's' : ''}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                          sp.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                        }`}>
                          {sp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/service-providers/${sp.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setShowDeleteConfirm(sp.id)}
                            disabled={deletingId === sp.id}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === sp.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-gray-500">
                        <div className="p-3 bg-slate-100 dark:bg-gray-800 rounded-full">
                          <Factory className="w-10 h-10 opacity-50" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">No service providers found</p>
                          <p className="text-sm mt-0.5">
                            {searchTerm || filterStatus !== 'all' ? "Try adjusting your search" : "Add your first provider"}
                          </p>
                        </div>
                        {!searchTerm && filterStatus === 'all' && (
                          <Link
                            href="/dashboard/service-providers/new"
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <Plus className="w-4 h-4" /> Add Provider
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function ServiceProvidersSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-80 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-slate-200/60 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
                <div className="h-8 w-16 bg-slate-200 dark:bg-gray-700 rounded" />
              </div>
              <div className="w-12 h-12 bg-slate-100 dark:bg-gray-900 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-36 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="h-5 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-slate-100 dark:bg-gray-900 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
                  <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
                </div>
              </div>
              <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-6 w-20 bg-slate-100 dark:bg-gray-900 rounded-lg" />
              <div className="h-6 w-16 bg-slate-100 dark:bg-gray-900 rounded-lg" />
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
                <div className="w-8 h-8 bg-slate-100 dark:bg-gray-900 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}