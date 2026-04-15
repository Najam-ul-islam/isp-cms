"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  CreditCard,
  IndianRupee,
  Plus,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import RecordPaymentModal from "@/components/saas/RecordPaymentModal";

interface SaaSInvoicesTableProps {
  companyId: string;
  invoices: any[];
  stats: {
    totalBilled: number;
    totalPaid: number;
    totalRemaining: number;
    totalInvoices: number;
  };
  error: string | null;
}

export default function SaaSInvoicesTable({
  companyId,
  invoices: initialInvoices,
  stats,
  error,
}: SaaSInvoicesTableProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatBillingPeriod = (billingPeriod: string | null, issuedDate?: string) => {
    if (!billingPeriod && issuedDate) {
      // Fallback to issued date if billing period is not set
      const date = new Date(issuedDate);
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (!billingPeriod) return "N/A";
    const [year, month] = billingPeriod.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        );
      case "partial":
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "unpaid":
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60";
      case "partial":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60";
      case "unpaid":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-800/60";
      case "overdue":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60";
      case "cancelled":
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-600/60";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200/60 dark:border-gray-600/60";
    }
  };

  const handleRecordPayment = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    router.refresh();
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (filterStatus !== "all" && invoice.effectivePaymentStatus !== filterStatus) {
      return false;
    }

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.id.toLowerCase().includes(searchLower) ||
      invoice.description?.toLowerCase().includes(searchLower) ||
      invoice.billingPeriod?.includes(searchLower)
    );
  });

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 rounded-xl p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            SaaS Invoices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage company billing and payments ({stats.totalInvoices} total)
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/saas/companies/${companyId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            Back to Company
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total Billed
            </p>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <IndianRupee className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatPKR(stats.totalBilled)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.totalInvoices} invoices
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Total Paid
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPKR(stats.totalPaid)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Payments received
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Outstanding
            </p>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold ${
              stats.totalRemaining > 0
                ? "text-orange-600 dark:text-orange-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatPKR(stats.totalRemaining)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats.totalRemaining > 0 ? "Pending recovery" : "All cleared"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices by ID, description, or billing month..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition-all"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="SaaS invoice table">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-750 dark:to-gray-700/50 border-b border-gray-200/60 dark:border-gray-700/60">
                <tr>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Billing Month
                  </th>
                  <th className="text-left py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Issued Date
                  </th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Base Amount
                  </th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Carry Forward
                  </th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="text-right py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="text-center py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center py-3.5 px-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors duration-200"
                  >
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {invoice.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-50">
                          {formatBillingPeriod(invoice.billingPeriod, invoice.issuedDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(invoice.issuedDate)}
                    </td>
                    <td className="py-4 px-4 text-xs text-right text-gray-900 dark:text-gray-50 font-medium">
                      {formatPKR(invoice.amount)}
                    </td>
                    <td className="py-4 px-4 text-xs text-right">
                      <span
                        className={
                          invoice.carryForwardAmount > 0
                            ? "text-orange-600 dark:text-orange-400 font-medium"
                            : "text-gray-400"
                        }
                      >
                        {invoice.carryForwardAmount > 0
                          ? formatPKR(invoice.carryForwardAmount)
                          : "-"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-right font-semibold text-gray-900 dark:text-gray-50">
                      {formatPKR(invoice.totalAmount)}
                    </td>
                    <td className="py-4 px-4 text-xs text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatPKR(invoice.totalPaid)}
                    </td>
                    <td className="py-4 px-4 text-xs text-right">
                      <span
                        className={
                          invoice.remainingAmount > 0
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {formatPKR(invoice.remainingAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(invoice.effectivePaymentStatus)}
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyles(
                            invoice.effectivePaymentStatus
                          )}`}
                        >
                          {invoice.effectivePaymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/saas/companies/${companyId}/invoices/${invoice.id}`
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        {invoice.effectivePaymentStatus !== "paid" && (
                          <button
                            onClick={() => handleRecordPayment(invoice)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors duration-200"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No invoices found
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "No SaaS billing records available"}
            </p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
