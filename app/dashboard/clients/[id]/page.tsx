'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Client, Package, ServiceProvider, Payment } from '@prisma/client';
import {
  User, Phone, MapPin, Calendar, CreditCard, IndianRupee,
  Building, Factory, Wifi, Clock, Mail, Hash, ArrowLeft, Edit2,
  BarChart3, DollarSign, Receipt, AlertTriangle, AtSign, ChevronDown, ChevronUp, Globe
} from 'lucide-react';
import Link from 'next/link';

interface ClientWithPackage extends Client {
  package: Package & { serviceProvider?: ServiceProvider | null };
  area?: { id: string; name: string; description: string | null } | null;
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
  const [showDetails, setShowDetails] = useState(false);

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
      <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60"></div>
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60"></div>
            <div className="h-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 p-4 lg:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">Error Loading Client</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error || 'Client not found'}</p>
          <Link href="/dashboard/clients" className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>
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
    if (clientExpired) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60';
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
      case 'suspended': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-600/60';
    }
  };

  const getPaymentStyles = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'unpaid': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'partial': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
  };

  const clientExpired = isExpired(client.expiryDate);

  const InfoRow = ({ icon: Icon, label, value, valueClassName }: { icon: any; label: string; value: string; valueClassName?: string }) => (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      <span className="text-xs text-gray-500 dark:text-gray-300 flex-shrink-0">{label}:</span>
      <span className={`text-xs font-medium truncate ${valueClassName || 'text-gray-900 dark:text-gray-50'}`}>{value}</span>
    </div>
  );

  return (
    <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 p-3 lg:p-5 flex flex-col gap-3 lg:gap-4">
      {/* Top Row: Header with client identity and actions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all duration-300 ease-out">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/clients"
            className="p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-200 ease-out"
            aria-label="Back to clients list"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50 truncate">{client.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(client.status || 'unknown', clientExpired)}`}>
                {clientExpired ? 'Expired' : client.status || 'unknown'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPaymentStyles(client.effectivePaymentStatus || client.paymentStatus || 'unknown')}`}>
                {client.effectivePaymentStatus || client.paymentStatus || 'unknown'}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 dark:text-gray-300">
              <span className="flex items-center gap-1 truncate">
                <Phone className="w-3 h-3" />
                {client.phone}
              </span>
              {client.email && (
                <span className="flex items-center gap-1 truncate hidden sm:inline">
                  <Mail className="w-3 h-3" />
                  {client.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/dashboard/clients/${client.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-500 dark:bg-blue-600 rounded-lg border border-transparent hover:border-blue-400/60 dark:hover:border-blue-300/60 hover:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20 transition-all duration-200 ease-out"
            aria-label="Edit client"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Link>
          <Link
            href={`/dashboard/clients/${client.id}/invoice`}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-emerald-500 dark:bg-emerald-600 rounded-lg border border-transparent hover:border-emerald-400/60 dark:hover:border-emerald-300/60 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 dark:hover:shadow-emerald-400/20 transition-all duration-200 ease-out"
            aria-label="View invoice"
          >
            <Receipt className="w-3.5 h-3.5" />
            Invoice
          </Link>
        </div>
      </div>

      {/* Middle Row: Three-column grid for Package, Location, Payment */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
        {/* Package Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
              <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Package</h2>
          </div>
          <div className="space-y-2">
            <InfoRow icon={Building} label="Plan" value={client.package?.name || 'No Package'} />
            <InfoRow icon={Clock} label="Speed" value={client.package?.speed ? `${client.package.speed} Mbps` : 'N/A'} />
            <InfoRow icon={IndianRupee} label="Monthly" value={formatPKR(client.price || 0)} />
            {client.package?.serviceProvider && (
              <InfoRow icon={Factory} label="Provider" value={client.package.serviceProvider.name} />
            )}
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out hover:border-violet-500/60 dark:hover:border-violet-400/60 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/30">
              <MapPin className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Location</h2>
          </div>
          <div className="space-y-2">
            <InfoRow icon={MapPin} label="Address" value={client.area?.name || client.areaName || 'Not provided'} />
            <InfoRow icon={Building} label="City" value={client.city} />
            <InfoRow icon={Globe} label="Country" value={client.country || 'Not specified'} />
            <InfoRow icon={Hash} label="CNIC" value={client.cnic} />
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Payment Summary</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-300">Total Amount</span>
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-50">{formatPKR(client.totalAmount || client.price || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-300">Total Paid</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatPKR(client.totalPaid || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-300">Remaining</span>
              <span className={`text-xs font-semibold ${(client.remainingAmount || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatPKR(client.remainingAmount || 0)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  (client.totalPaid || 0) >= (client.totalAmount || client.price || 0)
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : (client.remainingAmount || 0) > 0
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : 'bg-emerald-500 dark:bg-emerald-400'
                }`}
                style={{ width: `${Math.min(((client.totalPaid || 0) / (client.totalAmount || client.price || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Dates and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Dates Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out hover:border-amber-500/60 dark:hover:border-amber-400/60 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 hover:shadow-lg hover:shadow-amber-500/10 dark:hover:shadow-amber-400/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Key Dates</h2>
          </div>
          <div className="space-y-2">
            <InfoRow icon={Calendar} label="Start" value={formatDate(client.startDate)} />
            <InfoRow
              icon={Calendar}
              label="Expiry"
              value={formatDate(client.expiryDate)}
              valueClassName={clientExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-50'}
            />
          </div>
          {clientExpired && (
            <div className="mt-3 flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200/60 dark:border-red-800/60">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 dark:text-red-400">Service expired. Consider renewing.</p>
            </div>
          )}
        </div>

        {/* Username & Contact Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out hover:border-indigo-500/60 dark:hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-400/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
              <AtSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Contact</h2>
          </div>
          <div className="space-y-2">
            <InfoRow
              icon={AtSign}
              label="Username"
              value={client.username || 'Not set'}
              valueClassName={!client.username ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-gray-50'}
            />
            <InfoRow icon={Phone} label="Phone" value={client.phone} />
            <InfoRow icon={Mail} label="Email" value={client.email || 'Not provided'} />
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-700/50">
              <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="flex items-center gap-2 w-full p-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-200 ease-out"
              aria-label="Edit client details"
            >
              <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Edit Client
            </Link>
            <Link
              href={`/dashboard/payments?clientId=${client.id}`}
              className="flex items-center gap-2 w-full p-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10 transition-all duration-200 ease-out"
              aria-label="View payment history"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              View Payments
            </Link>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 w-full p-2.5 text-sm text-gray-700 dark:text-gray-200 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-violet-500/60 dark:hover:border-violet-400/60 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-400/10 transition-all duration-200 ease-out"
              aria-expanded={showDetails}
              aria-label="Toggle detailed information"
            >
              {showDetails ? <ChevronUp className="w-4 h-4 text-violet-600 dark:text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details Section - Payment History & Additional Info */}
      {showDetails && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Payment History
          </h2>
          {client.payments && client.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Payment history table">
                <thead>
                  <tr className="border-b border-gray-200/60 dark:border-gray-700/60">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-300">Date</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-300">Amount</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-300">Method</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {client.payments.map((payment, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors duration-200">
                      <td className="py-2 px-2 text-gray-900 dark:text-gray-50">{formatDate(payment.paymentDate)}</td>
                      <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-medium">{formatPKR(payment.amount)}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs">
                          {payment.method}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-300 py-4 text-center">No payment history available</p>
          )}
        </div>
      )}
    </div>
  );
}
