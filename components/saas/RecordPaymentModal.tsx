"use client";

import { useState } from "react";
import { X, CreditCard, CheckCircle, XCircle } from "lucide-react";

interface RecordPaymentModalProps {
  invoice: {
    id: string;
    amount: number;
    carryForwardAmount: number;
    remainingAmount: number;
    totalAmount: number;
    totalPaid: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordPaymentModal({
  invoice,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "bank_transfer",
    notes: "",
    gateway: "",
    transactionId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/saas/companies/${invoice.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "recordPayment",
          invoiceId: invoice.id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          notes: paymentForm.notes,
          gateway: paymentForm.gateway,
          transactionId: paymentForm.transactionId,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to record payment");
      }
    } catch {
      setError("An error occurred while recording payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200/80 dark:border-gray-700/80 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Record Payment
                  </h2>
                  <p className="text-xs text-emerald-100 mt-1">
                    Invoice #{invoice.id.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200/60 dark:border-blue-700/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                Total Amount
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {formatPKR(invoice.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                Already Paid
              </p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {formatPKR(invoice.totalPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">
                Remaining
              </p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {formatPKR(invoice.remainingAmount)}
              </p>
            </div>
            {invoice.carryForwardAmount > 0 && (
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                  Carry Forward
                </p>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {formatPKR(invoice.carryForwardAmount)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-3 p-4 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60 text-red-700 dark:text-red-300">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Payment Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Payment Amount (PKR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
                Rs.
              </span>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                required
                min="1"
                max={invoice.remainingAmount}
                step="0.01"
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white font-semibold"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Maximum: {formatPKR(invoice.remainingAmount)}
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, method: e.target.value })
              }
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Gateway & Transaction ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Gateway
              </label>
              <input
                type="text"
                value={paymentForm.gateway}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, gateway: e.target.value })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
                placeholder="e.g., Stripe, JazzCash"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Transaction ID
              </label>
              <input
                type="text"
                value={paymentForm.transactionId}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    transactionId: e.target.value,
                  })
                }
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, notes: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-gray-900 dark:text-white resize-none"
              placeholder="Payment details or reference number..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
