'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package as PackageType, ServiceProvider } from '@prisma/client';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Wifi,
  Clock,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  Factory,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  Users,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface ExtendedPackage extends PackageType {
  _count?: {
    clients: number;
  };
}

export default function ServiceProviderPackagesPage() {
  const { id } = useParams();
  const router = useRouter();

  const [serviceProvider, setServiceProvider] = useState<ServiceProvider | null>(null);
  const [packages, setPackages] = useState<ExtendedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'purchasePrice' | 'speed' | 'duration'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchServiceProviderAndPackages = async () => {
      try {
        const spRes = await fetch(`/api/service-providers/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });

        if (!spRes.ok) {
          if (spRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch service provider');
        }

        const spData: ServiceProvider = await spRes.json();
        setServiceProvider(spData);

        const pkgRes = await fetch('/api/packages', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });

        if (!pkgRes.ok) {
          if (pkgRes.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch packages');
        }

        const allPackages: ExtendedPackage[] = await pkgRes.json();
        const spPackages = allPackages.filter(pkg => pkg.serviceProviderId === id);
        setPackages(spPackages);
      } catch (err) {
        console.error('Error fetching data:', err);
        showNotification('error', 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceProviderAndPackages();
  }, [id, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const pkgRes = await fetch('/api/packages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (pkgRes.ok) {
        const allPackages: ExtendedPackage[] = await pkgRes.json();
        const spPackages = allPackages.filter(pkg => pkg.serviceProviderId === id);
        setPackages(spPackages);
      }
    } catch (err) {
      console.error('Error refreshing packages:', err);
      showNotification('error', 'Failed to refresh packages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (pkgId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setDeletingId(pkgId);
    try {
      const res = await fetch(`/api/packages/${pkgId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        setPackages(packages.filter(pkg => pkg.id !== pkgId));
        showNotification('success', 'Package deleted successfully');
        setShowDeleteConfirm(null);
      } else {
        const error = await res.json();
        showNotification('error', error.message || 'Failed to delete package');
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      showNotification('error', 'An error occurred while deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPackages = packages
    .filter(pkg => {
      const matchesSearch =
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.speed.toString().includes(searchTerm) ||
        pkg.price.toString().includes(searchTerm);
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'purchasePrice':
          comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
          break;
        case 'speed':
          comparison = a.speed - b.speed;
          break;
        case 'duration':
          comparison = a.durationDays - b.durationDays;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalValue = packages.reduce((sum, pkg) => sum + pkg.price, 0);
  const totalClients = packages.reduce((sum, pkg) => sum + (pkg._count?.clients || 0), 0);
  const activePackageCount = packages.filter(p => p.isActive).length;

  if (loading) {
    return <PackagesSkeleton />;
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
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">Delete Package?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this package? All associated clients will need to be reassigned.
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

      {/* Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2" aria-label="Breadcrumb">
            <Link
              href="/dashboard/service-providers"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            >
              Service Providers
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/dashboard/service-providers/${id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded"
            >
              {serviceProvider?.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-900 dark:text-gray-50 font-medium">Packages</span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/service-providers/${id}`)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              title="Back to provider"
              aria-label="Back to provider"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Factory className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50">
                  {serviceProvider?.name} Packages
                </h1>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Manage internet service packages
              </p>
            </div>
          </div>
        </div>
        <Link
          href={`/dashboard/packages/new?serviceProviderId=${id}`}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 dark:bg-blue-600 text-white font-semibold rounded-xl
                     border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60
                     hover:bg-blue-600 dark:hover:bg-blue-500
                     hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
                     transition-all duration-200 ease-out hover:-translate-y-0.5
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <Plus className="w-5 h-5" />
          Add Package
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-4 transition-all duration-300 ease-out
                        hover:border-violet-500/60 dark:hover:border-violet-400/60
                        hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                        hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Packages</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{packages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-4 transition-all duration-300 ease-out
                        hover:border-emerald-500/60 dark:hover:border-emerald-400/60
                        hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20
                        hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clients</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-4 transition-all duration-300 ease-out
                        hover:border-blue-500/60 dark:hover:border-blue-400/60
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                        hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatPKR(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search packages by name, speed, or price..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                         transition-all duration-200 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
              aria-label="Search packages"
            />
          </div>

          <div className="relative">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              className="appearance-none pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 dark:focus:border-blue-400/60
                         transition-all duration-200 text-gray-900 dark:text-gray-50 cursor-pointer text-sm
                         hover:border-gray-300/60 dark:hover:border-gray-600/60 min-w-[200px]"
              aria-label="Sort packages"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="price-asc">Sale Price (Low-High)</option>
              <option value="price-desc">Sale Price (High-Low)</option>
              <option value="purchasePrice-asc">Purchase Price (Low-High)</option>
              <option value="purchasePrice-desc">Purchase Price (High-Low)</option>
              <option value="speed-asc">Speed (Low-High)</option>
              <option value="speed-desc">Speed (High-Low)</option>
              <option value="duration-asc">Duration (Short-Long)</option>
              <option value="duration-desc">Duration (Long-Short)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-50">All Packages</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''} found
                  {activePackageCount > 0 && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                      ({activePackageCount} active)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-gray-500/50 disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh packages"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filteredPackages.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/60">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('speed');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      Speed
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => {
                        setSortBy('price');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      Sale Price
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    <button
                      onClick={() => {
                        setSortBy('purchasePrice');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      Purchase Price
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    <button
                      onClick={() => {
                        setSortBy('duration');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none"
                    >
                      Duration
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clients</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredPackages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="group transition-all duration-200 hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
                          <Wifi className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {pkg.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {pkg.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Wifi className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{pkg.speed} Mbps</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatPKR(pkg.price)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">{formatPKR(pkg.purchasePrice || 0)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 text-sm">{pkg.durationDays} days</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        (pkg._count?.clients || 0) > 0
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400'
                      }`}>
                        <Users className="w-3 h-3" />
                        {pkg._count?.clients || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuOpen(actionMenuOpen === pkg.id ? null : pkg.id);
                            }}
                            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                            aria-label="Actions"
                            aria-expanded={actionMenuOpen === pkg.id}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {actionMenuOpen === pkg.id && (
                            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 py-1 z-10 animate-scale-in">
                              <Link
                                href={`/dashboard/packages/${pkg.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(pkg.id);
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
                <Package className="w-10 h-10 opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-600 dark:text-gray-300 text-lg">No packages found</p>
                <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">
                  {searchTerm
                    ? `No results for "${searchTerm}"`
                    : 'Create your first package for this provider'}
                </p>
              </div>
              {!searchTerm && (
                <Link
                  href={`/dashboard/packages/new?serviceProviderId=${id}`}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium
                             hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20
                             focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Create Package
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Table Footer */}
        {filteredPackages.length > 0 && (
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Showing {filteredPackages.length} of {packages.length} packages</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  Total Value: <strong className="text-emerald-600 dark:text-emerald-400">{formatPKR(totalValue)}</strong>
                </span>
              </div>
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

function PackagesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-8 w-72 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          <div className="w-48 h-10 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-4 w-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse hidden lg:block" />
              <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded animate-pulse hidden md:block" />
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
