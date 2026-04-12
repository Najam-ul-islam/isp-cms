"use client";

import { useState } from "react";
import { X, CreditCard, Smartphone, Shield, ArrowRight, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  title: string;
  description: string;
  metadata: {
    referenceType: "subscription" | "invoice";
    referenceId?: string;
    clientId?: string;
    invoiceId?: string;
  };
  additionalCharges?: Array<{ name: string; amount: number }>;
}

type PaymentGateway = "stripe" | "jazzcash" | "easypaisa";

interface PaymentMethod {
  id: PaymentGateway;
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "stripe",
    name: "Credit / Debit Card",
    description: "Visa, Mastercard, AMEX",
    icon: <CreditCard className="w-5 h-5" />,
    recommended: true,
  },
  {
    id: "jazzcash",
    name: "JazzCash",
    description: "Pay via JazzCash Wallet",
    icon: <Smartphone className="w-5 h-5" />,
  },
  {
    id: "easypaisa",
    name: "EasyPaisa",
    description: "Pay via EasyPaisa Wallet",
    icon: <Smartphone className="w-5 h-5" />,
  },
];

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  title,
  description,
  metadata,
  additionalCharges = [],
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentGateway | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gateway: selectedMethod,
          amount,
          description: title,
          referenceType: metadata.referenceType,
          referenceId: metadata.referenceId,
          clientId: metadata.clientId,
          invoiceId: metadata.invoiceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Payment initiation failed");
      }

      const data = await response.json();

      // Redirect to payment gateway
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setSelectedMethod(null);
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-slate-50 to-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Complete Payment</h2>
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Summary Card */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">{title}</span>
              <Shield className="w-4 h-4 text-blue-500" />
            </div>
            
            {/* Package Price */}
            {additionalCharges.length > 0 && (
              <div className="flex justify-between text-xs text-blue-600 mb-1">
                <span>Package</span>
                <span>PKR {(amount - additionalCharges.reduce((s, c) => s + c.amount, 0)).toLocaleString()}</span>
              </div>
            )}
            
            {/* Additional Charges Breakdown */}
            {additionalCharges.map((charge, idx) => (
              <div key={idx} className="flex justify-between text-xs text-orange-600 mb-1">
                <span>{charge.name}</span>
                <span>PKR {charge.amount.toLocaleString()}</span>
              </div>
            ))}
            
            {/* Total */}
            <div className="flex items-baseline gap-1 mt-2 pt-2 border-t border-blue-200">
              <span className="text-xs text-blue-600">PKR</span>
              <span className="text-3xl font-bold text-blue-900">
                {amount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Select Payment Method
            </label>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  disabled={loading}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left ${
                    selectedMethod === method.id
                      ? "border-blue-500 bg-blue-50/50 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {/* Icon */}
                  <div
                    className={`p-2.5 rounded-lg ${
                      selectedMethod === method.id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {method.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {method.name}
                      </span>
                      {method.recommended && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {method.description}
                    </p>
                  </div>

                  {/* Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedMethod === method.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300"
                    }`}
                  >
                    {selectedMethod === method.id && (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Secure Payment</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verified Gateways</span>
            </div>
          </div>
        </div>

        {/* Footer / Action */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handlePayment}
            disabled={!selectedMethod || loading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 ${
              !selectedMethod || loading
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initiating Payment...</span>
              </>
            ) : (
              <>
                <span>Pay PKR {amount.toLocaleString()}</span>
                {!selectedMethod ? (
                  <span className="text-xs font-normal opacity-75">
                    (Select method)
                  </span>
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 mt-3">
            {loading
              ? "Redirecting to secure payment gateway..."
              : "You will be redirected to complete payment securely"}
          </p>
        </div>
      </div>
    </div>
  );
}
