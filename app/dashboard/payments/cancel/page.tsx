"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made. You can try
          again or choose a different payment method.
        </p>
        <div className="space-y-3">
          <Link
            href="/dashboard/subscription"
            className="block w-full px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
