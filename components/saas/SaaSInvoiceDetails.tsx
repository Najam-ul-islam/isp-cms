"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Calendar,
  CreditCard,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import RecordPaymentModal from "@/components/saas/RecordPaymentModal";

interface SaaSInvoiceDetailsProps {
  companyId: string;
  invoice: any;
  error: string | null;
}

export default function SaaSInvoiceDetails({
  companyId,
  invoice,
  error,
}: SaaSInvoiceDetailsProps) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      month: "long",
      day: "numeric",
    });
  };

  const formatBillingPeriod = (billingPeriod: string | null) => {
    if (!billingPeriod) return "N/A";
    const [year, month] = billingPeriod.split("-");
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "partial":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "unpaid":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case "overdue":
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    router.refresh();
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 rounded-xl p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
          Invoice not found
        </p>
      </div>
    );
  }

  const effectiveStatus =
    invoice.totalPaid === 0
      ? "unpaid"
      : invoice.remainingAmount > 0
      ? "partial"
      : "paid";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/saas/companies/${companyId}/invoices`}
            className="p-2 rounded-lg border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-500/60 dark:hover:border-blue-400/60 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                  Invoice Details
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {invoice.id.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
        {effectiveStatus !== "paid" && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-500 dark:bg-emerald-600 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all duration-200"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div
        className={`flex items-center gap-4 p-5 rounded-xl border ${getStatusColor(
          effectiveStatus
        )}`}
      >
        {getStatusIcon(effectiveStatus)}
        <div className="flex-1">
          <p className="text-sm font-semibold capitalize">
            Invoice Status: {effectiveStatus}
          </p>
          <p className="text-xs opacity-80 mt-1">
            {effectiveStatus === "paid"
              ? "This invoice has been fully paid"
              : effectiveStatus === "partial"
              ? "Partial payment received, balance remaining"
              : "No payment received yet"}
          </p>
        </div>
      </div>

      {/* Invoice Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Invoice Breakdown
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Billing Period
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatBillingPeriod(invoice.billingPeriod)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Plan
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {invoice.plan?.name || "N/A"}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Base Amount
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-50">
                  {formatPKR(invoice.amount)}
                </span>
              </div>
              {invoice.carryForwardAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Carry Forward (from previous invoice)
                  </span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {formatPKR(invoice.carryForwardAmount)}
                  </span>
                </div>
              )}
              {invoice.creditUsed > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Credit Applied
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    - {formatPKR(invoice.creditUsed)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-gray-50">
                  Total Payable
                </span>
                <span className="font-bold text-xl text-gray-900 dark:text-gray-50">
                  {formatPKR(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total Paid
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatPKR(invoice.totalPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Remaining Balance
                </span>
                <span
                  className={`font-bold text-xl ${
                    invoice.remainingAmount > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {formatPKR(invoice.remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Invoice Information
            </h3>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Issued Date
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatDate(invoice.issuedDate)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Due Date
              </p>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>
          {invoice.description && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Description
              </p>
              <p className="text-base text-gray-900 dark:text-white">
                {invoice.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Payment History
            </h3>
          </div>
        </div>

        <div className="p-6">
          {invoice.payments.length > 0 ? (
            <div className="space-y-3">
              {invoice.payments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
                        {formatPKR(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(payment.paymentDate)}
                      </p>
                      {payment.method && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Method:{" "}
                          <span className="font-medium capitalize">
                            {payment.method.replace("_", " ")}
                          </span>
                        </p>
                      )}
                      {payment.gateway && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Gateway: {payment.gateway}
                        </p>
                      )}
                      {payment.transactionId && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Transaction: {payment.transactionId}
                        </p>
                      )}
                      {payment.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Notes: {payment.notes}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No payments recorded yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Previous Invoice Link */}
      {invoice.previousInvoice && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This invoice includes a carry-forward amount of{" "}
            <span className="font-semibold">
              {formatPKR(invoice.carryForwardAmount)}
            </span>{" "}
            from previous invoice{" "}
            <Link
              href={`/saas/companies/${companyId}/invoices/${invoice.previousInvoice.id}`}
              className="font-medium underline hover:no-underline"
            >
              #{invoice.previousInvoice.id.slice(-8).toUpperCase()}
            </Link>
          </p>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
