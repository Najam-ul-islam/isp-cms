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
  Activity,
  TrendingUp,
  Users,
  Mail,
  Phone,
  ArrowUpRight,
  MoreVertical,
  Building2
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
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const router = useRouter();

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

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

        const fetchServiceProviders = async () => {
          try {
            const res = await fetch('/api/service-providers', {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
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
    const authCheck = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include'
    });

    if (authCheck.status === 401) {
      router.push('/login');
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/service-providers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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
  const inactiveCount = serviceProviders.length - activeCount;
  const totalPackages = serviceProviders.reduce((sum, sp) => sum + (sp._count?.packages || 0), 0);

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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDeleteConfirm(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200/60 dark:border-gray-700/60 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">Delete Service Provider?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this service provider? All associated packages will need to be reassigned.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 font-medium border border-gray-200/60 dark:border-gray-700/60 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId !== null}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 hover:shadow-lg hover:shadow-red-500/20"
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

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50">
              Service Providers
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage internet service providers and their packages
          </p>
        </div>
        <Link
          href="/dashboard/service-providers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 dark:bg-blue-600 text-white font-semibold rounded-xl
                     border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                     hover:bg-blue-600 dark:hover:bg-blue-500
                     hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
                     transition-all duration-200 ease-out hover:-translate-y-0.5
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <Plus className="w-5 h-5" />
          Add Provider
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Providers */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-violet-500/60 dark:hover:border-violet-400/60
                        hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                        hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/30 rounded-xl">
              <Factory className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Providers</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{serviceProviders.length}</p>
        </div>

        {/* Active Providers */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-emerald-500/60 dark:hover:border-emerald-400/60
                        hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20
                        hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Providers</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {serviceProviders.length > 0 ? Math.round((activeCount / serviceProviders.length) * 100) : 0}% of total
          </p>
        </div>

        {/* Inactive Providers */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-red-500/60 dark:hover:border-red-400/60
                        hover:bg-red-50/50 dark:hover:bg-red-900/20
                        hover:shadow-lg hover:shadow-red-500/10 dark:hover:shadow-red-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-red-500 dark:text-red-400 rotate-180" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactive Providers</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{inactiveCount}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {serviceProviders.length > 0 ? Math.round((inactiveCount / serviceProviders.length) * 100) : 0}% of total
          </p>
        </div>

        {/* Total Packages */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-blue-500/60 dark:hover:border-blue-400/60
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                        hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Packages</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalPackages}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Across all providers
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search by provider name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                         transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              aria-label="Search providers"
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                         transition-all duration-200 text-gray-900 dark:text-gray-50 cursor-pointer text-sm
                         hover:border-gray-300/60 dark:hover:border-gray-600/60"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                <Factory className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-50">All Service Providers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {filteredServiceProviders.length} provider{filteredServiceProviders.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <button
              onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 500); }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              title="Refresh"
              aria-label="Refresh providers"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
          </div>
        ) : filteredServiceProviders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Packages</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredServiceProviders.map((sp) => (
                  <tr
                    key={sp.id}
                    className="group cursor-pointer transition-all duration-200
                               hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                    onClick={() => router.push(`/dashboard/service-providers/${sp.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                          {sp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {sp.name}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {sp.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {sp.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{sp.email}</span>
                          </div>
                        )}
                        {sp.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{sp.phone}</span>
                          </div>
                        )}
                        {!sp.email && !sp.phone && (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                      {new Date(sp.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/service-providers/${sp.id}/packages`}
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                    ${(sp._count?.packages || 0) > 0
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 hover:shadow-sm'
                                      : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                                    }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        {sp._count?.packages || 0}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        sp.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sp.isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'}`}></span>
                        {sp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(actionMenuOpen === sp.id ? null : sp.id);
                            }}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                            aria-label="Actions"
                            aria-expanded={actionMenuOpen === sp.id}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuOpen === sp.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 py-1 z-10 animate-scale-in">
                              <Link
                                href={`/dashboard/service-providers/${sp.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(sp.id);
                                  setActionMenuOpen(null);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="px-6 py-16">
            <div className="flex flex-col items-center gap-4 text-gray-400 dark:text-gray-500">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <Factory className="w-10 h-10 opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No service providers found</p>
                <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first provider'}
                </p>
              </div>
              {!searchTerm && filterStatus === 'all' && (
                <Link
                  href="/dashboard/service-providers/new"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium
                             hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Provider
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div className="fixed inset-0 z-5" onClick={() => setActionMenuOpen(null)} aria-hidden="true" />
      )}
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function ServiceProvidersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          <div className="w-36 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse hidden lg:block" />
              <div className="h-6 w-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="h-6 w-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
