'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Users,
  UserCheck,
  UserX,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Contact,
  BarChart3,
  Activity,
  ChevronRight,
  ExternalLink,
  Edit2,
  Building2,
  Clock,
  CalendarDays,
  Receipt,
  Wallet
} from 'lucide-react';

interface ProviderInfo {
  id: string;
  name: string;
  isActive: boolean;
  contactInfo: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  totalPackages: number;
}

interface PackageDistribution {
  isActive: boolean;
  count: number;
  totalValue: number;
  avgPrice: number;
}

interface TopClient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  package: {
    name: string;
    price: number;
  } | null;
  totalPaid: number;
  paymentCount: number;
}

interface AnalyticsData {
  provider: ProviderInfo;
  totalPackages: number;
  totalPackageValue: number;
  activeUsers: number;
  expiredUsers: number;
  totalRecharge: number;
  avgPurchasePrice: number;
  revenueLast30Days: number;
  revenuePrevious30Days: number;
  revenueChangePercent: number;
  paymentCountLast30Days: number;
  packageDistribution: PackageDistribution[];
  topClients: TopClient[];
  totalPayments: number;
  totalPaymentVolume: number;
  timestamp: string;
}

export default function ProviderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const authCheck = await fetch('/api/auth/check', {
        credentials: 'include',
      });

      if (authCheck.status === 401) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/service-providers/${providerId}/analytics`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('Service provider not found');
          return;
        }
        if (res.status === 403) {
          setError('Access denied');
          return;
        }
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [providerId]);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 animate-fade-in">
        <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200/60 dark:border-red-700/60">
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{error}</h2>
        <button
          onClick={() => router.push('/dashboard/service-providers')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium
                     hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200
                     hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5
                     focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Providers
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { provider } = data;
  const activePackageCount = data.packageDistribution.find(p => p.isActive)?.count || 0;

  return (
    <div className="space-y-6 animate-fade-in">
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
            <span className="text-gray-900 dark:text-gray-50 font-medium">{provider.name}</span>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/service-providers')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              title="Back to providers"
              aria-label="Back to providers"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-50">
                {provider.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Service Provider Analytics & Performance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl
                       border border-gray-200/60 dark:border-gray-700/60 font-medium text-sm
                       hover:border-gray-300/60 dark:hover:border-gray-600/60 hover:bg-gray-100 dark:hover:bg-gray-700/50
                       transition-all duration-200 disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-gray-500/50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href={`/dashboard/service-providers/${provider.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 dark:bg-blue-600 text-white rounded-xl font-medium text-sm
                       hover:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200
                       hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <Edit2 className="w-4 h-4" />
            Edit Provider
          </Link>
        </div>
      </div>

      {/* Provider Info Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden
                      transition-all duration-300 ease-out">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/20 flex-shrink-0">
                {provider.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 truncate">{provider.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    provider.isActive
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${provider.isActive ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400'}`}></span>
                    {provider.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {provider.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{provider.email}</span>
                    </div>
                  )}
                  {provider.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{provider.phone}</span>
                    </div>
                  )}
                  {provider.contactInfo && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Contact className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{provider.contactInfo}</span>
                    </div>
                  )}
                  {provider.address && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{provider.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-row lg:flex-col gap-4 lg:border-l lg:border-gray-100 dark:lg:border-gray-700/60 lg:pl-6 lg:min-w-[180px]">
              <div className="text-center lg:text-left flex-1 lg:flex-none">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-center lg:justify-start gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Packages
                </p>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">{provider.totalPackages}</p>
              </div>
              <div className="text-center lg:text-left flex-1 lg:flex-none">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-center lg:justify-start gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Active Clients
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Packages */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-violet-500/60 dark:hover:border-violet-400/60
                        hover:bg-violet-50/50 dark:hover:bg-violet-900/20
                        hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-900/30 rounded-xl">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
              {activePackageCount} active
            </span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Packages</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">{data.totalPackages}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Value: {formatPKR(data.totalPackageValue)}
          </p>
        </div>

        {/* Active Users */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-emerald-500/60 dark:hover:border-emerald-400/60
                        hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20
                        hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{data.activeUsers}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Currently subscribed
          </p>
        </div>

        {/* Expired Users */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-red-500/60 dark:hover:border-red-400/60
                        hover:bg-red-50/50 dark:hover:bg-red-900/20
                        hover:shadow-lg hover:shadow-red-500/10 dark:hover:shadow-red-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-xl">
              <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Expired Users</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{data.expiredUsers}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Require renewal
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60
                        rounded-xl p-5 transition-all duration-300 ease-out
                        hover:border-blue-500/60 dark:hover:border-blue-400/60
                        hover:bg-blue-50/50 dark:hover:bg-blue-900/20
                        hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10
                        hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <DollarSign className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatPKR(data.totalRecharge)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Lifetime collections
          </p>
        </div>
      </div>

      {/* Revenue Trend Section */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Revenue Trend</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">30-day performance comparison</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Period */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20
                          rounded-xl border border-blue-100/60 dark:border-blue-700/40">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last 30 Days</p>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatPKR(data.revenueLast30Days)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              {data.paymentCountLast30Days} payments
            </p>
          </div>

          {/* Previous Period */}
          <div className="p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/40">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Previous 30 Days</p>
            </div>
            <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">
              {formatPKR(data.revenuePrevious30Days)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Comparison period
            </p>
          </div>

          {/* Growth */}
          <div className={`p-5 rounded-xl border ${
            data.revenueChangePercent >= 0
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100/60 dark:border-emerald-700/40'
              : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100/60 dark:border-red-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {data.revenueChangePercent >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Growth</p>
            </div>
            <p className={`text-3xl font-bold ${
              data.revenueChangePercent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {data.revenueChangePercent >= 0 ? '+' : ''}{data.revenueChangePercent.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {data.revenueChangePercent >= 0 ? 'Increase' : 'Decrease'} vs previous
            </p>
          </div>
        </div>
      </div>

      {/* Package Distribution & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Package Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
              <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Package Distribution</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active vs inactive packages</p>
            </div>
          </div>

          <div className="space-y-3">
            {data.packageDistribution.map((dist) => (
              <div
                key={dist.isActive ? 'active' : 'inactive'}
                className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/40
                           transition-all duration-200 hover:border-gray-200 dark:hover:border-gray-500/60"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${dist.isActive ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {dist.isActive ? 'Active Packages' : 'Inactive Packages'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{dist.count}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Total Value</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPKR(dist.totalValue)}</span>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Avg Price</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatPKR(dist.avgPrice)}</span>
                  </div>
                </div>
              </div>
            ))}

            {data.packageDistribution.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No packages found</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">Top Clients</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">By total payment amount</p>
            </div>
          </div>

          <div className="space-y-2">
            {data.topClients.slice(0, 5).map((client, index) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30
                           hover:bg-blue-50/50 dark:hover:bg-blue-900/10
                           hover:border-blue-200/60 dark:hover:border-blue-700/40
                           border border-transparent
                           rounded-xl transition-all duration-200 group
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold flex-shrink-0 shadow-md shadow-violet-500/20">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {client.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {client.paymentCount} payments
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                      {formatPKR(client.totalPaid)}
                    </p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}

            {data.topClients.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No client data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-50">Payment Overview</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Complete payment statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-600/40
                          transition-all duration-200 hover:border-gray-200 dark:hover:border-gray-500/60">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Payments</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{data.totalPayments}</p>
          </div>
          <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20
                          rounded-xl border border-blue-100/60 dark:border-blue-700/40
                          transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-600/60">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total Volume</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatPKR(data.totalPaymentVolume)}
            </p>
          </div>
          <div className="text-center p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20
                          rounded-xl border border-emerald-100/60 dark:border-emerald-700/40
                          transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-600/60">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Avg Payment</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatPKR(data.totalPayments > 0 ? Math.round(data.totalPaymentVolume / data.totalPayments) : 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Provider Info Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="hidden lg:block space-y-4 pl-6 border-l border-gray-100 dark:border-gray-700">
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Analytics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="w-12 h-5 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Revenue Trend Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Distribution & Top Clients Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-5" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Stats Skeleton */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-6">
        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
