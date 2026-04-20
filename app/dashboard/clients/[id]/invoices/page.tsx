'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Receipt,
  ArrowLeft,
  Calendar,
  IndianRupee,
  Filter,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  FileText,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  quantity: number;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber?: string | null;
  amount: number;
  totalAmount: number | null;
  issuedDate: string;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
  billingMonth: string | null;
  carryForwardAmount: number;
  creditUsed: number;
  previousInvoiceId: string | null;
  additionalCharges: any;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  clientId: string;
  items: InvoiceItem[];
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string | null;
    notes: string | null;
  }>;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  previousInvoice?: Invoice | null;
}

interface InvoiceHistoryResponse {
  invoices: Invoice[];
  total: number;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalRemaining: number;
  };
}

export default function ClientInvoiceHistoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const clientId = id as string;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, totalRemaining: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/clients/${clientId}/invoices?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.ok) {
        const data: InvoiceHistoryResponse = await response.json();
        setInvoices(data.invoices);
        setSummary(data.summary);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 404) {
        setError('Client not found');
        router.push('/dashboard/clients');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch invoices' }));
        setError(errorData.error || 'Failed to fetch invoices');
        router.push('/dashboard/clients');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('An unexpected error occurred');
      router.push('/dashboard/clients');
    } finally {
      setLoading(false);
    }
  }, [clientId, filterStatus, router]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBillingMonth = (billingMonth: string | null, issuedDate?: string) => {
    if (!billingMonth && issuedDate) {
      // Fallback to issued date if billing month is not set
      const date = new Date(issuedDate);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (!billingMonth) return 'N/A';
    const [year, month] = billingMonth.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'unpaid':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
      case 'partial':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      case 'unpaid':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-600/60';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.id.toLowerCase().includes(searchLower) ||
      invoice.description?.toLowerCase().includes(searchLower) ||
      invoice.billingMonth?.includes(searchLower)
    );
  });

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  if (error) {
    return (
      <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 p-4 lg:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">Error Loading Invoices</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <Link href="/dashboard/clients" className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="h-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50/50 dark:bg-gray-900/50 p-3 lg:p-5 flex flex-col gap-3 lg:gap-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/clients/${clientId}`}
            className="p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200"
            aria-label="Back to client details"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="h-10 w-10 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Invoice History</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Complete billing records and payment history</p>
          </div>
        </div>
        <Link
          href={`/dashboard/clients/${clientId}/invoice`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 dark:bg-emerald-600 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all duration-200"
        >
          <FileText className="w-4 h-4" />
          Create New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Outstanding Invoices</p>
            <IndianRupee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{formatPKR(summary.totalBilled)}</p>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{invoices.filter(inv => inv.effectivePaymentStatus === 'unpaid' || inv.effectivePaymentStatus === 'partial').length} unpaid invoices</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Paid</p>
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(summary.totalPaid)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Payments received</p>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Outstanding</p>
            <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <p className={`text-2xl font-bold ${summary.totalRemaining > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatPKR(summary.totalRemaining)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {summary.totalRemaining > 0 ? 'Pending recovery' : 'All cleared'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200/60 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Invoice history table">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Billing Month</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Issued Date</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Base Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Carry Forward</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Paid</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors duration-200">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-50">
                          {formatBillingMonth(invoice.billingMonth, invoice.issuedDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(invoice.issuedDate)}
                    </td>
                    <td className="py-3 px-4 text-xs text-right text-gray-900 dark:text-gray-50 font-medium">
                      {formatPKR(invoice.amount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-right">
                      <span className={invoice.carryForwardAmount > 0 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-400'}>
                        {invoice.carryForwardAmount > 0 ? formatPKR(invoice.carryForwardAmount) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-right font-semibold text-gray-900 dark:text-gray-50">
                      {formatPKR(invoice.totalAmount ?? invoice.amount + invoice.carryForwardAmount)}
                    </td>
                    <td className="py-3 px-4 text-xs text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatPKR(invoice.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-xs text-right">
                      <span className={invoice.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                        {formatPKR(invoice.remainingAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(invoice.effectivePaymentStatus)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(invoice.effectivePaymentStatus)}`}>
                          {invoice.effectivePaymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleViewDetails(invoice)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors duration-200"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No invoices found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters' : 'No billing records available'}
            </p>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200/60 dark:border-gray-700/60 p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                 <div>
                   <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Invoice Details</h2>
                   <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedInvoice.invoiceNumber || selectedInvoice.id.slice(-8).toUpperCase()}</p>
                 </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Line Items */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Line Items</h3>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start py-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                          )}
                          {item.quantity > 1 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">Qty: {item.quantity} x {formatPKR(item.amount)}</p>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          {formatPKR(item.amount * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice Breakdown */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Invoice Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total Amount</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{formatPKR(selectedInvoice.totalAmount ?? selectedInvoice.amount)}</span>
                  </div>
                  {selectedInvoice.carryForwardAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Carry Forward</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">+ {formatPKR(selectedInvoice.carryForwardAmount)}</span>
                    </div>
                  )}
                  {selectedInvoice.creditUsed > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Credit Applied</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">- {formatPKR(selectedInvoice.creditUsed)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="font-semibold text-gray-900 dark:text-gray-50">Total Paid</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatPKR(selectedInvoice.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-900 dark:text-gray-50">Remaining</span>
                    <span className={`font-bold text-lg ${selectedInvoice.remainingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatPKR(selectedInvoice.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">Payment History</h3>
                {selectedInvoice.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div key={payment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-medium text-gray-900 dark:text-gray-50">{formatPKR(payment.amount)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.paymentDate)}</p>
                          </div>
                          <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                            {payment.method || 'N/A'}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{payment.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">No payments recorded</p>
                )}
              </div>

               {/* Previous Invoice Link */}
               {selectedInvoice.previousInvoiceId && (
                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-lg p-3">
                   <p className="text-xs text-blue-700 dark:text-blue-300">
                     This invoice includes <span className="font-semibold">{formatPKR(selectedInvoice.carryForwardAmount)}</span> from previous invoice #{selectedInvoice.previousInvoice?.invoiceNumber ?? selectedInvoice.previousInvoiceId.slice(-8).toUpperCase()}
                   </p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
