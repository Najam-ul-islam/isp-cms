'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Package, ServiceProvider, Payment } from '@prisma/client';
import {
  User, Phone, MapPin, Calendar, CreditCard, IndianRupee,
  Building, Factory, Wifi, Clock, Mail, Hash, ArrowLeft, Edit2,
  BarChart3, DollarSign, Receipt, AlertTriangle, AtSign
} from 'lucide-react';
import Link from 'next/link';

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null };
}

interface ExtendedClient extends ClientWithPackage {
  email: any;
  _count?: { payments: number };
  payments?: Payment[];
  totalPaid?: number;
  remainingAmount?: number;
  totalAmount?: number;
  effectivePaymentStatus?: string;
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ExtendedClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`, {
          credentials: 'include',
          cache: 'no-store'
        });

        if (res.ok) {
          const data: ExtendedClient = await res.json();

          // Fetch payment history separately
          const paymentRes = await fetch(`/api/payments?clientId=${id}`, {
            credentials: 'include',
            cache: 'no-store'
          });

          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            const updatedData = {
              ...data,
              payments: paymentData
            };
            setClient(updatedData);
          } else {
            // If payment fetch fails, still show client data without payments
            setClient(data);
          }
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          setError('Failed to fetch client data');
        }
      } catch (err) {
        console.error('Error fetching client:', err);
        setError('An error occurred while fetching client data');
        router.push('/login'); // Redirect to login on error as well
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchClient();
    }
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Error Loading Client</h1>
            <p className="text-slate-600 dark:text-slate-300">{error || 'Client not found'}</p>
            <Link href="/dashboard/clients" className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isExpired = (expiryDate: Date | string) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusStyles = (status: string, clientExpired: boolean) => {
    if (clientExpired) return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'suspended': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
    }
  };

  const getPaymentStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'unpaid': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300';
      case 'partial': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const clientExpired = isExpired(client.expiryDate);

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-900/20 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/dashboard/clients" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </Link>
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{client.name}</h1>
                  <p className="text-slate-500 dark:text-slate-400">Client Details</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/dashboard/clients/${client.id}/edit`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Client
              </Link>
              <Link
                href={`/dashboard/clients/${client.id}/invoice`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
              >
                <Receipt className="w-4 h-4" />
                View Invoice
              </Link>
            </div>
          </div>
        </div>

        {/* Client Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className={`text-sm font-semibold ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                  {clientExpired ? 'Expired' : client.status}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Fee</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatPKR(client.price || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Payment Status</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {client.effectivePaymentStatus || client.paymentStatus || 'unknown'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Expiry Date</p>
                <p className={`text-sm font-semibold ${clientExpired ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                  {formatDate(client.expiryDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Client Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Full Name</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Username</p>
                  {client.username ? (
                    <p className="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                      <AtSign className="w-4 h-4 text-blue-500" />{client.username}
                    </p>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 italic">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">CNIC</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.cnic}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Phone Number</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Email</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">City</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.city}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Area</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.area || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Package Information */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Package Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Package Name</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.package?.name || 'No Package'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Speed</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.package?.speed ? `${client.package.speed} Mbps` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Service Provider</p>
                  <p className="text-slate-800 dark:text-white font-medium">{client.package?.serviceProvider?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Purchase Price</p>
                  <p className="text-slate-800 dark:text-white font-medium">
                    {client.package?.purchasePrice ? formatPKR(client.package.purchasePrice) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Payment History</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-300">Total Amount</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-200">{formatPKR(client.totalAmount || 0)}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                    <p className="text-sm text-emerald-600 dark:text-emerald-300">Total Paid</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-200">{formatPKR(client.totalPaid || 0)}</p>
                  </div>
                  <div className={`bg-${
                    (client.remainingAmount || 0) > 0 ? 'amber-50 dark:bg-amber-900/20' : 'emerald-50 dark:bg-emerald-900/20'
                  } rounded-xl p-4`}>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Remaining</p>
                    <p className={`text-lg font-bold ${
                      (client.remainingAmount || 0) > 0
                        ? 'text-amber-700 dark:text-amber-200'
                        : 'text-emerald-700 dark:text-emerald-200'
                    }`}>{formatPKR(client.remainingAmount || 0)}</p>
                  </div>
                </div>

                {/* Payment History Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Date</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Amount</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Method</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {client.payments && client.payments.length > 0 ? (
                        client.payments.map((payment, index) => (
                          <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                              {formatPKR(payment.amount)}
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                {payment.method}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400 text-sm">
                              {payment.notes || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 px-3 text-center text-slate-500 dark:text-slate-400">
                            No payment history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Status and Actions */}
          <div className="space-y-6">
            {/* Status Badges */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Status</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Client Status</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusStyles(client.status || 'unknown', clientExpired)}`}>
                    {clientExpired ? 'Expired' : client.status || 'unknown'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Payment Status</p>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${getPaymentStyles(client.effectivePaymentStatus || client.paymentStatus || 'unknown')}`}>
                    {client.effectivePaymentStatus || client.paymentStatus || 'unknown'}
                  </span>
                </div>
                {client.totalPaid !== undefined && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Paid</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{formatPKR(client.totalPaid)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href={`/dashboard/clients/${client.id}/edit`}
                  className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Edit Client</span>
                </Link>
                <Link
                  href={`/dashboard/clients/${client.id}/invoice`}
                  className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>View Invoice</span>
                </Link>
                <Link
                  href={`/dashboard/payments?clientId=${client.id}`}
                  className="flex items-center gap-3 w-full p-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>View Payments</span>
                </Link>
              </div>
            </div>

            {/* Expiration Warning */}
            {clientExpired && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-rose-800 dark:text-rose-200">Service Expired</h3>
                    <p className="text-sm text-rose-600 dark:text-rose-300 mt-1">
                      This client's service has expired on {formatDate(client.expiryDate)}. Consider renewing their subscription.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}